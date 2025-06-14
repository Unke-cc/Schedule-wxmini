// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'c-s-5gpguyfs450d7163'
})

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

// 云函数入口函数
exports.main = async (event, context) => {
  const { 
    userId,
    classId,
    status,
    startDate,
    endDate,
    page = 1,
    pageSize = 20
  } = event

  try {
    let query = {
      status: status || 'active'
    }

    // 如果指定了班级ID
    if (classId) {
      query.classId = classId
    } else {
      // 获取用户所在的所有班级
      const { data: memberData } = await db.collection('class_members')
        .where({
          userId: userId,
          status: 'active'
        })
        .get()

      const classIds = memberData.map(item => item.classId)
      query.classId = _.in(classIds)
    }

    // 如果指定了日期范围
    if (startDate) {
      query.startTime = _.gte(new Date(startDate))
    }
    if (endDate) {
      query.endTime = _.lte(new Date(endDate))
    }

    // 获取总数
    const countResult = await db.collection('tasks')
      .where(query)
      .count()

    // 获取任务列表
    const { data: tasks } = await db.collection('tasks')
      .where(query)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .orderBy('createTime', 'desc')
      .get()

    // 获取每个任务的打卡统计
    const tasksWithStats = await Promise.all(tasks.map(async task => {
      // 获取打卡记录统计
      const { total: totalMembers } = await db.collection('class_members')
        .where({
          classId: task.classId,
          status: 'active'
        })
        .count()

      const { total: completedCount } = await db.collection('check_records')
        .where({
          taskId: task._id,
          status: 'completed'
        })
        .count()

      return {
        ...task,
        statistics: {
          totalMembers,
          completedCount,
          completionRate: totalMembers > 0 ? (completedCount / totalMembers * 100).toFixed(1) : 0
        }
      }
    }))

    return {
      success: true,
      tasks: tasksWithStats,
      total: countResult.total,
      currentPage: page,
      totalPages: Math.ceil(countResult.total / pageSize),
      message: '获取任务列表成功'
    }

  } catch (err) {
    console.error(err)
    return {
      success: false,
      message: '获取任务列表失败，请稍后重试'
    }
  }
}
