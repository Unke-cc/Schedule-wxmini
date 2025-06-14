// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用动态环境ID
})

// 云函数入口函数
exports.main = async (event, context) => {
  const { 
    title, 
    description, 
    startTime, 
    endTime, 
    location,
    creatorId,
    classId
  } = event

  console.log('[createTask] 接收到的参数:', event)

  const db = cloud.database()

  try {
    // 验证创建者身份
    console.log('[createTask] 开始验证用户身份, creatorId:', creatorId)
    const { data: userData } = await db.collection('users')
      .doc(creatorId)
      .get()

    console.log('[createTask] 查询到的用户数据:', userData)

    if (!userData) {
      return {
        success: false,
        message: '未找到用户信息'
      }
    }

    if (userData.role !== 'teacher') {
      return {
        success: false,
        message: `只有教师可以创建任务，当前用户角色: ${userData.role}`
      }
    }

    // 验证班级信息
    if (classId) {
      const { data: classData } = await db.collection('classes')
        .doc(classId)
        .get()

      if (!classData) {
        return {
          success: false,
          message: '未找到班级信息'
        }
      }

      // 验证是否为班级教师
      const { data: teacherData } = await db.collection('class_members')
        .where({
          classId,
          userId: creatorId,
          role: 'teacher',
          status: 'active'
        })
        .get()

      if (!teacherData || teacherData.length === 0) {
        return {
          success: false,
          message: '您不是该班级的教师'
        }
      }
    }

    // 创建任务
    console.log('[createTask] 开始创建任务')
    const taskData = {
      title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      location,
      creatorId,
      classId,
      status: 'active',
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
    console.log('[createTask] 任务数据:', taskData)

    const result = await db.collection('tasks').add({
      data: taskData
    })

    // 如果有班级，创建通知
    if (classId) {
      try {
        // 获取班级成员
        const { data: members } = await db.collection('class_members')
          .where({
            classId,
            status: 'active'
          })
          .get()

        // 创建通知
        const notificationPromises = members.map(member => {
          return db.collection('notifications').add({
            data: {
              userId: member.userId,
              type: 'task',
              title: '新任务通知',
              content: `教师发布了新任务：${title}`,
              relatedId: result._id,
              status: 'unread',
              createTime: db.serverDate(),
              readTime: null
            }
          })
        })

        await Promise.all(notificationPromises)
      } catch (notifyErr) {
        console.error('[createTask] 创建通知失败:', notifyErr)
        // 通知创建失败不影响任务创建的结果
      }
    }

    console.log('[createTask] 创建任务成功, taskId:', result._id)
    return {
      success: true,
      taskId: result._id
    }
  } catch (err) {
    console.error('[createTask] 创建任务失败:', err)
    return {
      success: false,
      message: err.message || '创建任务失败'
    }
  }
}
