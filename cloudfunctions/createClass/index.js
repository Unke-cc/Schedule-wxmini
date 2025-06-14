// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'c-s-5gpguyfs450d7163'
})

const db = cloud.database()
const _ = db.command

// 生成6位随机班级码
function generateClassCode() {
  const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return code
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { className, description, teacherId } = event

  try {
    // 生成唯一的班级码
    let classCode
    let isUnique = false
    while (!isUnique) {
      classCode = generateClassCode()
      const { data } = await db.collection('classes').where({
        classCode: classCode
      }).get()
      if (data.length === 0) {
        isUnique = true
      }
    }

    // 创建班级
    const classResult = await db.collection('classes').add({
      data: {
        className,
        classCode,
        description,
        teacherId,
        members: [teacherId], // 创建者自动加入班级
        createTime: db.serverDate(),
        updateTime: db.serverDate(),
        memberCount: 1,
        status: 'active'
      }
    })

    // 更新教师的班级列表
    await db.collection('users').doc(teacherId).update({
      data: {
        classes: _.push(classResult._id)
      }
    })

    // 获取创建的班级信息
    const { data: classInfo } = await db.collection('classes').doc(classResult._id).get()

    return {
      success: true,
      classInfo,
      message: '创建成功'
    }

  } catch (err) {
    console.error(err)
    return {
      success: false,
      message: '创建失败，请稍后重试'
    }
  }
}
