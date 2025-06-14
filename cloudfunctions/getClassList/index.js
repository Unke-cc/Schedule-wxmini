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
  const { userId, role } = event

  try {
    // 获取用户加入的所有班级ID
    const { data: memberData } = await db.collection('class_members')
      .where({
        userId: userId,
        status: 'active'
      })
      .get()

    const classIds = memberData.map(item => item.classId)

    if (classIds.length === 0) {
      return {
        success: true,
        classList: [],
        message: '暂无班级信息'
      }
    }

    // 获取班级详细信息
    const { data: classList } = await db.collection('classes')
      .where({
        _id: _.in(classIds),
        status: 'active'
      })
      .get()

    // 为每个班级添加成员信息
    const classListWithMembers = await Promise.all(classList.map(async (classItem) => {
      const { data: members } = await db.collection('class_members')
        .aggregate()
        .match({
          classId: classItem._id,
          status: 'active'
        })
        .lookup({
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userInfo'
        })
        .project({
          _id: 1,
          role: 1,
          joinTime: 1,
          'userInfo.username': 1,
          'userInfo.nickName': 1,
          'userInfo.avatarUrl': 1
        })
        .end()

      return {
        ...classItem,
        members: members
      }
    }))

    return {
      success: true,
      classList: classListWithMembers,
      message: '获取班级列表成功'
    }

  } catch (err) {
    console.error(err)
    return {
      success: false,
      message: '获取班级列表失败，请稍后重试'
    }
  }
}
