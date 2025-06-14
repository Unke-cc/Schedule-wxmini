// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'c-s-5gpguyfs450d7163'
})

const db = cloud.database()
const _ = db.command

// 检查时间冲突
async function checkTimeConflict(classId, weekday, startTime, endTime, weeks, excludeId = null) {
  const query = {
    classId,
    weekday,
    status: 'active',
    weeks: _.elemMatch(_.in(weeks))
  }

  if (excludeId) {
    query._id = _.neq(excludeId)
  }

  const { data } = await db.collection('schedules')
    .where(query)
    .get()

  for (const schedule of data) {
    const existingStart = new Date(`2000-01-01 ${schedule.startTime}`).getTime()
    const existingEnd = new Date(`2000-01-01 ${schedule.endTime}`).getTime()
    const newStart = new Date(`2000-01-01 ${startTime}`).getTime()
    const newEnd = new Date(`2000-01-01 ${endTime}`).getTime()

    if (
      (newStart >= existingStart && newStart < existingEnd) ||
      (newEnd > existingStart && newEnd <= existingEnd) ||
      (newStart <= existingStart && newEnd >= existingEnd)
    ) {
      return true
    }
  }

  return false
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { 
    classId,
    courseName,
    teacherId,
    weekday,
    startTime,
    endTime,
    location,
    type = 'lecture',
    weeks = [],
    description = ''
  } = event

  try {
    // 验证教师权限
    const { data: teacherData } = await db.collection('class_members')
      .where({
        classId,
        userId: teacherId,
        role: 'teacher',
        status: 'active'
      })
      .get()

    if (teacherData.length === 0) {
      return {
        success: false,
        message: '您没有权限添加课程'
      }
    }

    // 验证时间格式
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return {
        success: false,
        message: '时间格式不正确'
      }
    }

    // 验证星期
    if (weekday < 1 || weekday > 7) {
      return {
        success: false,
        message: '星期数不正确'
      }
    }

    // 验证周数
    if (!Array.isArray(weeks) || weeks.length === 0) {
      return {
        success: false,
        message: '请选择上课周数'
      }
    }

    for (const week of weeks) {
      if (week < 1 || week > 20) {
        return {
          success: false,
          message: '周数必须在1-20之间'
        }
      }
    }

    // 检查时间冲突
    const hasConflict = await checkTimeConflict(classId, weekday, startTime, endTime, weeks)
    if (hasConflict) {
      return {
        success: false,
        message: '该时间段已有其他课程'
      }
    }

    // 添加课程
    const result = await db.collection('schedules').add({
      data: {
        classId,
        courseName,
        teacherId,
        weekday,
        startTime,
        endTime,
        location: location || '',
        type,
        weeks,
        description,
        createTime: db.serverDate(),
        updateTime: db.serverDate(),
        status: 'active'
      }
    })

    // 创建课程通知
    const { data: members } = await db.collection('class_members')
      .where({
        classId,
        status: 'active'
      })
      .get()

    const notificationPromises = members.map(member => {
      return db.collection('notifications').add({
        data: {
          userId: member.userId,
          type: 'system',
          title: '新课程通知',
          content: `班级添加了新课程：${courseName}`,
          relatedId: result._id,
          status: 'unread',
          createTime: db.serverDate(),
          readTime: null
        }
      })
    })

    await Promise.all(notificationPromises)

    return {
      success: true,
      scheduleId: result._id,
      message: '课程添加成功'
    }

  } catch (err) {
    console.error(err)
    return {
      success: false,
      message: '添加课程失败，请稍后重试'
    }
  }
}
