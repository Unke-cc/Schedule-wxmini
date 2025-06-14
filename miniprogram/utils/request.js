const DEFAULT_LOADING_TEXT = '加载中'
const DEFAULT_ERROR_DURATION = 2000
const DEFAULT_TIMEOUT = 15000

// 统一的加载状态控制
const showLoading = (title = DEFAULT_LOADING_TEXT) => {
  wx.showLoading({
    title,
    mask: true
  })
}

const hideLoading = () => {
  wx.hideLoading()
}

// 统一的错误提示
const showError = (message, duration = DEFAULT_ERROR_DURATION) => {
  wx.showToast({
    title: message || '操作失败',
    icon: 'none',
    duration
  })
}

// 统一的成功提示
const showSuccess = (message, duration = DEFAULT_ERROR_DURATION) => {
  wx.showToast({
    title: message || '操作成功',
    icon: 'success',
    duration
  })
}

// 封装云函数调用
const callCloudFunction = async ({
  name,
  data = {},
  loading = true,
  loadingText = DEFAULT_LOADING_TEXT,
  showError: shouldShowError = true,
  timeout = DEFAULT_TIMEOUT
}) => {
  try {
    if (loading) {
      showLoading(loadingText)
    }

    const result = await Promise.race([
      wx.cloud.callFunction({
        name,
        data
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('请求超时')), timeout)
      )
    ])

    if (!result.result?.success) {
      throw new Error(result.result?.message || '操作失败')
    }

    return result.result
  } catch (error) {
    console.error(`调用云函数 ${name} 失败:`, error)
    if (shouldShowError) {
      showError(error.message)
    }
    throw error
  } finally {
    if (loading) {
      hideLoading()
    }
  }
}

// 检查网络状态
const checkNetworkStatus = () => {
  return new Promise((resolve) => {
    wx.getNetworkType({
      success: (res) => {
        resolve(res.networkType !== 'none')
      },
      fail: () => {
        resolve(false)
      }
    })
  })
}

// 网络状态监听
const initNetworkListener = (callback) => {
  wx.onNetworkStatusChange((res) => {
    callback(res.isConnected)
  })
}

module.exports = {
  callCloudFunction,
  showLoading,
  hideLoading,
  showError,
  showSuccess,
  checkNetworkStatus,
  initNetworkListener
} 