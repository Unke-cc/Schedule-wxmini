// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'c-s-5gpguyfs450d7163'
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const { 
    taskId,
    title, 
    description, 
    taskType,
    startTime,
    endTime,
    skipWeekend,
    reminder,
    location,
    userId 
  } = event

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
        message: '您没有权限修改此任务'
      }
    }

    // 更新任务
    const updateData = {
      title,
      description,
      taskType,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      skipWeekend,
      reminder,
      location,
      updateTime: db.serverDate()
    }

    await db.collection('tasks').doc(taskId).update({
      data: updateData
    })

    // 如果修改了提醒设置，更新提醒通知
    if (reminder && reminder.enabled) {
      // 获取班级所有学生
      const { data: students } = await db.collection('class_members')
        .where({
          classId: taskData.classId,
          role: 'student',
          status: 'active'
        })
        .get()

      // 删除旧的提醒通知
      await db.collection('notifications')
        .where({
          relatedId: taskId,
          type: 'reminder'
        })
        .remove()

      // 创建新的提醒通知
      const notificationPromises = students.map(student => {
        return db.collection('notifications').add({
          data: {
            userId: student.userId,
            type: 'reminder',
            title: '打卡提醒更新',
            content: `打卡任务已更新：${title}`,
            relatedId: taskId,
            status: 'unread',
            createTime: db.serverDate(),
            readTime: null
          }
        })
      })

      await Promise.all(notificationPromises)
    }

    return {
      success: true,
      message: '任务更新成功'
    }

  } catch (err) {
    console.error(err)
    return {
      success: false,
      message: '更新任务失败，请稍后重试'
    }
  }
}
