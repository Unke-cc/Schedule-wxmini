// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

// 云函数入口函数
exports.main = async (event, context) => {
  const { taskId } = event
  const { OPENID } = cloud.getWXContext()

  try {
    // 获取任务信息
    const taskRes = await db.collection('tasks')
      .aggregate()
      .match({
        _id: taskId
      })
      .lookup({
        from: 'classes',
        localField: 'classId',
        foreignField: '_id',
        as: 'classInfo'
      })
      .lookup({
        from: 'users',
        localField: 'teacherId',
        foreignField: '_id',
        as: 'teacherInfo'
      })
      .end()

    if (!taskRes.list || taskRes.list.length === 0) {
      return {
        success: false,
        message: '任务不存在'
      }
    }

    const task = taskRes.list[0]
    const classInfo = task.classInfo[0]
    const teacherInfo = task.teacherInfo[0]

    // 获取打卡统计
    const checkStats = await db.collection('check_records')
      .aggregate()
      .match({
        taskId
      })
      .group({
        _id: '$status',
        count: $.sum(1)
      })
      .end()

    // 计算统计数据
    const stats = {
      totalCount: classInfo.memberCount || 0,
      completedCount: 0,
      onTimeCount: 0,
      lateCount: 0
    }

    checkStats.list.forEach(stat => {
      stats.completedCount += stat.count
      if (stat._id === 'normal') {
        stats.onTimeCount = stat.count
      } else if (stat._id === 'late') {
        stats.lateCount = stat.count
      }
    })

    stats.completionRate = Math.round((stats.completedCount / stats.totalCount) * 100) || 0

    // 确定任务状态
    const now = new Date()
    const startTime = new Date(task.startTime)
    const endTime = new Date(task.endTime)

    let status = 'pending'
    if (now > endTime) {
      status = 'expired'
    } else if (now >= startTime) {
      status = 'ongoing'
    }

    // 构建返回数据
    const taskInfo = {
      _id: task._id,
      title: task.title,
      description: task.description,
      startTime: task.startTime,
      endTime: task.endTime,
      className: classInfo.name,
      teacherName: teacherInfo.name,
      status,
      location: task.location || { required: false },
      ...stats
    }

    return {
      success: true,
      taskInfo
    }

  } catch (err) {
    console.error('获取任务详情失败:', err)
    return {
      success: false,
      message: '获取任务详情失败'
    }
  }
} 