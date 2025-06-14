// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 云函数入口函数
exports.main = async (event, context) => {
  const { userId } = event
  const db = cloud.database()
  const _ = db.command

  try {
    // 获取用户信息
    const { data: userData } = await db.collection('users')
      .doc(userId)
      .get()

    if (!userData) {
      return {
        success: false,
        message: '未找到用户信息'
      }
    }

    if (userData.role !== 'teacher') {
      return {
        success: false,
        message: '只有教师可以获取班级列表'
      }
    }

    // 获取教师的班级列表
    const { data: classes } = await db.collection('classes')
      .aggregate()
      .lookup({
        from: 'class_members',
        let: {
          classId: '$_id'
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$classId', '$$classId'] },
                  { $eq: ['$userId', userId] },
                  { $eq: ['$role', 'teacher'] },
                  { $eq: ['$status', 'active'] }
                ]
              }
            }
          }
        ],
        as: 'membership'
      })
      .match({
        'membership.0': { $exists: true }
      })
      .project({
        _id: 1,
        name: 1,
        description: 1,
        memberCount: 1,
        createTime: 1
      })
      .end()

    return {
      success: true,
      classes
    }
  } catch (err) {
    console.error('[getTeacherClasses] 获取班级列表失败:', err)
    return {
      success: false,
      message: err.message || '获取班级列表失败'
    }
  }
} 