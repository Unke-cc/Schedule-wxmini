// app.js
const { checkNetworkStatus, initNetworkListener, showError } = require('./utils/request')

App({
  globalData: {
    userInfo: null,
    isConnected: true,
    env: 'c-s-5gpguyfs450d7163'
  },

  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }

    wx.cloud.init({
      env: this.globalData.env,
      traceUser: true
    })

    // 检查网络状态
    this.checkNetwork()
    
    // 监听网络状态变化
    initNetworkListener((isConnected) => {
      this.globalData.isConnected = isConnected
      if (!isConnected) {
        showError('网络连接已断开')
      }
    })

    // 监听全局未捕获的Promise错误
    wx.onUnhandledRejection(({ reason }) => {
      console.error('Unhandled Promise Rejection:', reason)
      showError('系统错误，请稍后重试')
    })

    // 监听全局JS错误
    wx.onError((error) => {
      console.error('Global Error:', error)
      showError('系统错误，请稍后重试')
    })

    // 检查本地存储的登录状态
    this.checkLoginStatus()
  },

  async checkNetwork() {
    const isConnected = await checkNetworkStatus()
    this.globalData.isConnected = isConnected
    if (!isConnected) {
      showError('网络连接不可用')
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo) {
        this.globalData.userInfo = userInfo
      }
    } catch (err) {
      console.error('读取登录状态失败:', err)
    }
  },

  // 设置用户信息
  setUserInfo(userInfo) {
    this.globalData.userInfo = userInfo
    // 保存到本地存储
    wx.setStorage({
      key: 'userInfo',
      data: userInfo
    })
  },

  // 清除用户信息
  clearUserInfo() {
    this.globalData.userInfo = null
    wx.removeStorage({
      key: 'userInfo'
    })
  }
})
