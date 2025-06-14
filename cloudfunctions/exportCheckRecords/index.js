const cloud = require('wx-server-sdk')
const xlsx = require('node-xlsx')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

exports.main = async (event, context) => {
  const { taskId } = event
  const { OPENID } = cloud.getWXContext()

  try {
    // 获取任务信息
    const taskRes = await db.collection('tasks')
      .aggregate()
      .match({
        _id: taskId
      })
      .lookup({
        from: 'classes',
        localField: 'classId',
        foreignField: '_id',
        as: 'classInfo'
      })
      .end()

    if (!taskRes.list || taskRes.list.length === 0) {
      return {
        success: false,
        message: '任务不存在'
      }
    }

    const task = taskRes.list[0]
    const classInfo = task.classInfo[0]

    // 获取所有班级成员
    const membersRes = await db.collection('class_members')
      .aggregate()
      .match({
        classId: task.classId,
        status: 'active'
      })
      .lookup({
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'userInfo'
      })
      .end()

    // 获取所有打卡记录
    const recordsRes = await db.collection('check_records')
      .where({
        taskId
      })
      .get()

    // 构建打卡记录映射
    const recordMap = {}
    recordsRes.data.forEach(record => {
      recordMap[record.userId] = record
    })

    // 准备Excel数据
    const data = [
      [
        '序号',
        '姓名',
        '学号',
        '打卡状态',
        '打卡时间',
        '打卡位置'
      ]
    ]

    // 填充数据
    membersRes.list.forEach((member, index) => {
      const user = member.userInfo[0]
      const record = recordMap[user._id]
      const row = [
        index + 1,
        user.name || '未知',
        user.studentId || '-',
        record ? (record.status === 'normal' ? '正常' : '迟到') : '未打卡',
        record ? formatTime(new Date(record.checkTime)) : '-',
        record?.location ? record.location.address : '-'
      ]
      data.push(row)
    })

    // 生成Excel文件
    const buffer = xlsx.build([{
      name: '打卡记录',
      data
    }])

    // 上传到云存储
    const fileName = `${task.title}_打卡记录_${formatDate(new Date())}.xlsx`
    const uploadRes = await cloud.uploadFile({
      cloudPath: `exports/${fileName}`,
      fileContent: buffer
    })

    // 获取文件访问链接
    const fileRes = await cloud.getTempFileURL({
      fileList: [uploadRes.fileID]
    })

    return {
      success: true,
      fileUrl: fileRes.fileList[0].tempFileURL
    }

  } catch (err) {
    console.error('导出打卡记录失败:', err)
    return {
      success: false,
      message: '导出打卡记录失败'
    }
  }
}

// 格式化时间
function formatTime(date) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()

  return `${year}-${month}-${day} ${hour}:${minute}`
}

// 格式化日期
function formatDate(date) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  return `${year}${month}${day}`
} 