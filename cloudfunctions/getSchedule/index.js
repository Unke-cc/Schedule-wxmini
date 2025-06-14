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
    weekday,
    week,
    includeTeacherInfo = true
  } = event

  try {
    // 如果没有指定班级ID，获取用户所在的所有班级
    let classIds = []
    if (!classId) {
      const { data: memberData } = await db.collection('class_members')
        .where({
          userId: userId,
          status: 'active'
        })
        .get()
      classIds = memberData.map(item => item.classId)
    } else {
      classIds = [classId]
    }

    if (classIds.length === 0) {
      return {
        success: true,
        schedules: [],
        message: '暂无课程信息'
      }
    }

    // 构建查询条件
    let query = {
      classId: _.in(classIds),
      status: 'active'
    }

    if (weekday) {
      query.weekday = weekday
    }

    if (week) {
      query.weeks = week
    }

    // 获取课程信息
    let pipeline = [
      {
        $match: query
      },
      {
        $lookup: {
          from: 'classes',
          localField: 'classId',
          foreignField: '_id',
          as: 'classInfo'
        }
      }
    ]

    if (includeTeacherInfo) {
      pipeline.push({
        $lookup: {
          from: 'users',
          localField: 'teacherId',
          foreignField: '_id',
          as: 'teacherInfo'
        }
      })
    }

    pipeline.push({
      $project: {
        _id: 1,
        classId: 1,
        courseName: 1,
        weekday: 1,
        startTime: 1,
        endTime: 1,
        location: 1,
        type: 1,
        weeks: 1,
        'classInfo.className': 1,
        'teacherInfo.username': 1,
        'teacherInfo.nickName': 1
      }
    })

    const { list } = await db.collection('schedules')
      .aggregate()
      .append(...pipeline)
      .end()

    // 处理返回数据格式
    const schedules = list.map(schedule => ({
      ...schedule,
      name: schedule.courseName,
      className: schedule.classInfo[0]?.className || '',
      teacherName: includeTeacherInfo ? (schedule.teacherInfo[0]?.nickName || schedule.teacherInfo[0]?.username) : undefined,
      type: schedule.type || 'lecture' // 默认为普通课程
    }))

    // 按星期和时间排序
    schedules.sort((a, b) => {
      if (a.weekday !== b.weekday) {
        return a.weekday - b.weekday
      }
      return a.startTime.localeCompare(b.startTime)
    })

    return {
      success: true,
      schedule: schedules,
      message: '获取课程表成功'
    }

  } catch (err) {
    console.error(err)
    return {
      success: false,
      message: '获取课程表失败，请稍后重试'
    }
  }
}
