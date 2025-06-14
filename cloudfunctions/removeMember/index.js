const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { classId, userId, reason } = event
  const { OPENID } = cloud.getWXContext()

  try {
    // 获取教师信息
    const teacherRes = await db.collection('users')
      .where({
        openId: OPENID
      })
      .get()

    if (!teacherRes.data || teacherRes.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      }
    }

    const teacherId = teacherRes.data[0]._id

    // 检查班级是否存在且用户是否为创建者
    const classRes = await db.collection('classes')
      .doc(classId)
      .get()

    if (!classRes.data) {
      return {
        success: false,
        message: '班级不存在'
      }
    }

    if (classRes.data.teacherId !== teacherId) {
      return {
        success: false,
        message: '无权限移除成员'
      }
    }

    // 检查成员是否存在
    const memberRes = await db.collection('class_members')
      .where({
        classId,
        userId,
        status: 'active'
      })
      .get()

    if (!memberRes.data || memberRes.data.length === 0) {
      return {
        success: false,
        message: '成员不存在'
      }
    }

    // 开始事务
    const transaction = await db.startTransaction()

    try {
      // 更新成员状态
      await transaction.collection('class_members')
        .where({
          classId,
          userId,
          status: 'active'
        })
        .update({
          data: {
            status: 'removed',
            removeTime: db.serverDate(),
            removeBy: teacherId,
            removeReason: reason || ''
          }
        })

      // 更新班级成员数量
      await transaction.collection('classes')
        .doc(classId)
        .update({
          data: {
            memberCount: _.inc(-1),
            updateTime: db.serverDate()
          }
        })

      // 获取用户信息
      const userRes = await db.collection('users')
        .doc(userId)
        .get()

      // 创建通知
      await transaction.collection('notifications')
        .add({
          data: {
            userId,
            type: 'class',
            title: '移除通知',
            content: `您已被移出班级"${classRes.data.name}"${reason ? '，原因：' + reason : ''}`,
            status: 'unread',
            createTime: db.serverDate()
          }
        })

      // 提交事务
      await transaction.commit()

      // 发送订阅消息
      try {
        await cloud.callFunction({
          name: 'sendMessage',
          data: {
            templateId: 'your-template-id', // 需要替换为实际的模板ID
            openId: userRes.data.openId,
            data: {
              thing1: { value: classRes.data.name }, // 班级名称
              thing2: { value: '已被移出班级' }, // 状态变更
              time3: { value: new Date().toLocaleString() }, // 操作时间
              thing4: { value: reason || '无' } // 移除原因
            }
          }
        })
      } catch (err) {
        console.error('发送订阅消息失败:', err)
      }

      return {
        success: true,
        message: '已移除成员'
      }

    } catch (err) {
      // 回滚事务
      await transaction.rollback()
      throw err
    }

  } catch (err) {
    console.error('移除成员失败:', err)
    return {
      success: false,
      message: '操作失败'
    }
  }
} 