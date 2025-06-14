// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'c-s-5gpguyfs450d7163'
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const { username, password, role, name } = event

  try {
    // 检查用户名是否已存在
    const { data } = await db.collection('users').where({
      username: username
    }).get()

    if (data.length > 0) {
      return {
        success: false,
        message: '用户名已存在'
      }
    }

    // 创建新用户
    const result = await db.collection('users').add({
      data: {
        username,
        password, // 注意：实际项目中应该对密码进行加密
        role,
        name,
        classes: [], // 用户加入的班级列表
        createTime: db.serverDate(),
        updateTime: db.serverDate(),
        status: 'active'
      }
    })

    return {
      success: true,
      userId: result._id,
      message: '注册成功'
    }

  } catch (err) {
    console.error(err)
    return {
      success: false,
      message: '注册失败，请稍后重试'
    }
  }
}
