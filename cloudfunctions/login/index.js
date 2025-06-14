// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 云函数入口函数
exports.main = async (event, context) => {
  const { username, password } = event

  try {
    const db = cloud.database()
    const userCollection = db.collection('users')

    // 查询用户
    const { data: users } = await userCollection.where({
      username: username,
      password: password  // 注意：实际应用中应该使用加密后的密码
    }).get()

    if (users.length === 0) {
      return {
        success: false,
        message: '用户名或密码错误'
      }
    }

    const user = users[0]
    return {
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        avatar: user.avatar || null
      }
    }
  } catch (err) {
    console.error('[登录失败]', err)
    return {
      success: false,
      message: '登录失败，请稍后重试'
    }
  }
}
