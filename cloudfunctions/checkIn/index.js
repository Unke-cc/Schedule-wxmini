// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { taskId, location } = event
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

    // 获取任务信息
    const taskRes = await db.collection('tasks')
      .doc(taskId)
      .get()

    if (!taskRes.data) {
      return {
        success: false,
        message: '任务不存在'
      }
    }

    const task = taskRes.data
    const now = new Date()
    const startTime = new Date(task.startTime)
    const endTime = new Date(task.endTime)

    // 检查打卡时间
    if (now < startTime) {
      return {
        success: false,
        message: '打卡未开始'
      }
    }

    if (now > endTime) {
      return {
        success: false,
        message: '打卡已结束'
      }
    }

    // 检查是否已打卡
    const existingCheck = await db.collection('check_records')
      .where({
        taskId,
        userId
      })
      .get()

    if (existingCheck.data && existingCheck.data.length > 0) {
      return {
        success: false,
        message: '已经打过卡了'
      }
    }

    // 判断打卡状态
    let status = 'normal'
    if (now > endTime) {
      status = 'late'
    }

    // 创建打卡记录
    const checkData = {
      taskId,
      userId,
      checkTime: now,
      status,
      createTime: now
    }

    // 如果需要位置信息
    if (task.location?.required && location) {
      checkData.location = location
    }

    await db.collection('check_records').add({
      data: checkData
    })

    return {
      success: true,
      message: '打卡成功'
    }

  } catch (err) {
    console.error('打卡失败:', err)
    return {
      success: false,
      message: '打卡失败'
    }
  }
}
