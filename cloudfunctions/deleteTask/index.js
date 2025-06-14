// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'c-s-5gpguyfs450d7163'
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const { taskId, userId } = event

  try {
    // 获取任务信息
    const { data: taskData } = await db.collection('tasks').doc(taskId).get()
    
    if (!taskData) {
      return {
        success: false,
        message: '任务不存在'
      }
    }

    // 验证是否为任务创建者
    if (taskData.creatorId !== userId) {
      return {
        success: false,
        message: '您没有权限删除此任务'
      }
    }

    // 将任务移至回收站
    await db.collection('deleted_items').add({
      data: {
        originalId: taskId,
        collectionName: 'tasks',
        content: taskData,
        deleterId: userId,
        deleteTime: db.serverDate(),
        expireTime: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15天后过期
        status: 'pending'
      }
    })

    // 更新任务状态为已删除
    await db.collection('tasks').doc(taskId).update({
      data: {
        status: 'deleted',
        updateTime: db.serverDate()
      }
    })

    // 删除相关的提醒通知
    await db.collection('notifications')
      .where({
        relatedId: taskId,
        type: 'reminder'
      })
      .remove()

    // 创建删除通知给班级成员
    const { data: members } = await db.collection('class_members')
      .where({
        classId: taskData.classId,
        status: 'active'
      })
      .get()

    const notificationPromises = members.map(member => {
      return db.collection('notifications').add({
        data: {
          userId: member.userId,
          type: 'system',
          title: '任务删除通知',
          content: `任务"${taskData.title}"已被删除`,
          relatedId: taskId,
          status: 'unread',
          createTime: db.serverDate(),
          readTime: null
        }
      })
    })

    await Promise.all(notificationPromises)

    return {
      success: true,
      message: '任务已移至回收站'
    }

  } catch (err) {
    console.error(err)
    return {
      success: false,
      message: '删除任务失败，请稍后重试'
    }
  }
}
