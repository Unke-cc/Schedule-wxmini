const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { classId } = event
  const { OPENID } = cloud.getWXContext()

  try {
    // 获取用户信息
    const userRes = await db.collection('users')
      .where({
        openId: OPENID
      })
      .get()

    if (!userRes.data || userRes.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      }
    }

    const userId = userRes.data[0]._id

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

    if (classRes.data.teacherId !== userId) {
      return {
        success: false,
        message: '无权限删除班级'
      }
    }

    // 开始事务
    const transaction = await db.startTransaction()

    try {
      // 删除班级
      await transaction.collection('classes')
        .doc(classId)
        .update({
          data: {
            status: 'deleted',
            deleteTime: db.serverDate()
          }
        })

      // 更新成员状态
      await transaction.collection('class_members')
        .where({
          classId,
          status: 'active'
        })
        .update({
          data: {
            status: 'removed',
            removeTime: db.serverDate()
          }
        })

      // 更新任务状态
      await transaction.collection('tasks')
        .where({
          classId,
          status: _.in(['pending', 'ongoing'])
        })
        .update({
          data: {
            status: 'cancelled',
            updateTime: db.serverDate()
          }
        })

      // 提交事务
      await transaction.commit()

      return {
        success: true,
        message: '删除成功'
      }

    } catch (err) {
      // 回滚事务
      await transaction.rollback()
      throw err
    }

  } catch (err) {
    console.error('删除班级失败:', err)
    return {
      success: false,
      message: '删除失败'
    }
  }
} 