// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { userId } = event

  try {
    const db = cloud.database()
    const _ = db.command
    const tasksCollection = db.collection('tasks')

    // 获取用户相关的任务总数
    const totalQuery = await tasksCollection.where({
      userId: userId
    }).count()

    // 获取已完成的任务数
    const completedQuery = await tasksCollection.where({
      userId: userId,
      status: 'completed'
    }).count()

    const total = totalQuery.total || 0
    const completed = completedQuery.total || 0
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    return {
      success: true,
      total,
      completed,
      completionRate
    }
  } catch (err) {
    console.error('[获取统计信息失败]', err)
    return {
      success: false,
      message: '获取统计信息失败'
    }
  }
}
