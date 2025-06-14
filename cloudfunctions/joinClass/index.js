// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'c-s-5gpguyfs450d7163'
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const { classCode, studentId } = event

  try {
    // 查找班级
    const { data: classData } = await db.collection('classes').where({
      classCode: classCode,
      status: 'active'
    }).get()

    if (classData.length === 0) {
      return {
        success: false,
        message: '班级不存在或已关闭'
      }
    }

    const classInfo = classData[0]

    // 检查用户是否已经在班级中
    if (classInfo.members.includes(studentId)) {
      return {
        success: false,
        message: '您已经在这个班级中'
      }
    }

    // 更新班级成员列表
    await db.collection('classes').doc(classInfo._id).update({
      data: {
        members: _.push(studentId),
        memberCount: _.inc(1),
        updateTime: db.serverDate()
      }
    })

    // 更新学生的班级列表
    await db.collection('users').doc(studentId).update({
      data: {
        classes: _.push(classInfo._id)
      }
    })

    // 获取更新后的班级信息
    const { data: updatedClassInfo } = await db.collection('classes').doc(classInfo._id).get()

    return {
      success: true,
      classInfo: updatedClassInfo,
      message: '加入成功'
    }

  } catch (err) {
    console.error(err)
    return {
      success: false,
      message: '加入失败，请稍后重试'
    }
  }
}
