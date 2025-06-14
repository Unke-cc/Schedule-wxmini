const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { classId, updateData } = event
  const { OPENID } = cloud.getWXContext()

  try {
    // 获取用户信息
    const userRes = await db.collection('users')
      .where({
        openId: OPENID
      })
      .get()

    if (!userRes.data || userRes.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      }
    }

    const userId = userRes.data[0]._id

    // 检查班级是否存在且用户是否为创建者
    const classRes = await db.collection('classes')
      .doc(classId)
      .get()

    if (!classRes.data) {
      return {
        success: false,
        message: '班级不存在'
      }
    }

    if (classRes.data.teacherId !== userId) {
      return {
        success: false,
        message: '无权限修改班级信息'
      }
    }

    // 更新班级信息
    const allowedFields = [
      'name',
      'description',
      'year',
      'term',
      'courseName',
      'schedule',
      'requireApproval',
      'notice'
    ]

    // 过滤不允许更新的字段
    const filteredData = {}
    for (const key of allowedFields) {
      if (updateData.hasOwnProperty(key)) {
        filteredData[key] = updateData[key]
      }
    }

    // 添加更新时间
    filteredData.updateTime = db.serverDate()

    await db.collection('classes')
      .doc(classId)
      .update({
        data: filteredData
      })

    return {
      success: true,
      message: '更新成功'
    }

  } catch (err) {
    console.error('更新班级信息失败:', err)
    return {
      success: false,
      message: '更新失败'
    }
  }
} 