// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { taskId, userId } = event
  const { OPENID } = cloud.getWXContext()

  try {
    // 构建查询条件
    const query = { taskId }
    if (userId) {
      query.userId = userId
    }

    // 获取打卡记录
    const recordsRes = await db.collection('check_records')
      .aggregate()
      .match(query)
      .lookup({
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'userInfo'
      })
      .sort({
        checkTime: -1
      })
      .end()

    // 格式化记录数据
    const records = recordsRes.list.map(record => ({
      _id: record._id,
      userId: record.userId,
      name: record.userInfo[0]?.name || '未知',
      avatarUrl: record.userInfo[0]?.avatarUrl,
      checkTime: record.checkTime,
      status: record.status,
      location: record.location
    }))

    return {
      success: true,
      records
    }

  } catch (err) {
    console.error('获取打卡记录失败:', err)
    return {
      success: false,
      message: '获取打卡记录失败'
    }
  }
}
