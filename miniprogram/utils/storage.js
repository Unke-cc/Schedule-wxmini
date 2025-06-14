const { showLoading, hideLoading, showError } = require('./request')

// 生成随机字符串
const generateRandomString = (length = 8) => {
  return Math.random().toString(36).substring(2, 2 + length)
}

// 获取文件扩展名
const getFileExtension = (filename) => {
  return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2)
}

// 生成云存储路径
const generateCloudPath = (directory, filename, userId = '', options = {}) => {
  const ext = getFileExtension(filename)
  const timestamp = Date.now()
  const random = generateRandomString()
  
  switch (directory) {
    case 'avatar':
      return `avatars/${userId}/avatar.${ext}`
    case 'class-cover':
      return `class/covers/${options.classId}.${ext}`
    case 'class-material':
      return `class/materials/${options.classId}/${filename}`
    case 'task-attachment':
      return `tasks/attachments/${options.taskId}/${filename}`
    case 'task-submission':
      return `tasks/submissions/${options.taskId}/${userId}/${filename}`
    case 'check-in-qrcode':
      return `check_in/qrcodes/${options.taskId}.png`
    case 'check-in-record':
      return `check_in/records/${options.taskId}/${userId}/${timestamp}.${ext}`
    case 'temp':
    default:
      return `temp/${userId}/${timestamp}_${random}.${ext}`
  }
}

// 上传文件到云存储
const uploadFile = async ({
  filePath,
  directory,
  filename,
  userId = '',
  options = {},
  loadingText = '上传中'
}) => {
  try {
    showLoading(loadingText)
    
    const cloudPath = generateCloudPath(directory, filename, userId, options)
    
    const result = await wx.cloud.uploadFile({
      cloudPath,
      filePath
    })
    
    return {
      fileID: result.fileID,
      cloudPath
    }
  } catch (error) {
    console.error('上传文件失败:', error)
    showError('上传失败')
    throw error
  } finally {
    hideLoading()
  }
}

// 删除云存储文件
const deleteFile = async (fileID) => {
  try {
    await wx.cloud.deleteFile({
      fileList: [fileID]
    })
    return true
  } catch (error) {
    console.error('删除文件失败:', error)
    return false
  }
}

// 获取文件临时链接
const getTempFileURL = async (fileID) => {
  try {
    const result = await wx.cloud.getTempFileURL({
      fileList: [fileID]
    })
    
    if (result.fileList?.[0]?.tempFileURL) {
      return result.fileList[0].tempFileURL
    }
    throw new Error('获取文件链接失败')
  } catch (error) {
    console.error('获取文件链接失败:', error)
    return null
  }
}

// 下载文件
const downloadFile = async (fileID, loadingText = '下载中') => {
  try {
    showLoading(loadingText)
    
    const tempFileURL = await getTempFileURL(fileID)
    if (!tempFileURL) {
      throw new Error('获取文件链接失败')
    }
    
    const result = await wx.downloadFile({
      url: tempFileURL
    })
    
    if (result.statusCode === 200) {
      return result.tempFilePath
    }
    throw new Error('下载文件失败')
  } catch (error) {
    console.error('下载文件失败:', error)
    showError('下载失败')
    throw error
  } finally {
    hideLoading()
  }
}

module.exports = {
  uploadFile,
  deleteFile,
  getTempFileURL,
  downloadFile
} 