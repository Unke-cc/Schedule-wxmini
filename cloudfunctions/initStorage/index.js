const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 创建占位文件内容
const createPlaceholder = (dirPath) => {
  return `This is a placeholder file for the ${dirPath} directory.
Please do not delete this file as it maintains the directory structure.
Created at: ${new Date().toISOString()}`
}

// 初始化目录结构
exports.main = async (event, context) => {
  try {
    const directories = [
      'avatars/.placeholder',
      'class/covers/.placeholder',
      'class/materials/.placeholder',
      'tasks/attachments/.placeholder',
      'tasks/submissions/.placeholder',
      'check_in/qrcodes/.placeholder',
      'check_in/records/.placeholder',
      'temp/.placeholder'
    ]

    const uploadPromises = directories.map(async (dir) => {
      try {
        // 创建临时文件
        const tempPath = '/tmp/placeholder.txt'
        const fs = require('fs')
        fs.writeFileSync(tempPath, createPlaceholder(dir))

        // 上传到云存储
        const result = await cloud.uploadFile({
          cloudPath: dir,
          fileContent: Buffer.from(createPlaceholder(dir))
        })

        return {
          directory: dir,
          fileID: result.fileID,
          status: 'success'
        }
      } catch (error) {
        return {
          directory: dir,
          error: error.message,
          status: 'failed'
        }
      }
    })

    const results = await Promise.all(uploadPromises)

    return {
      success: true,
      message: '目录结构初始化完成',
      results
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
} 