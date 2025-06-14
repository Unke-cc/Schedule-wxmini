const { callCloudFunction } = require('../../utils/request')
const app = getApp()

Page({
  data: {
    userInfo: null,
    isAdmin: false,
    statistics: {
      totalTasks: 0,
      completedTasks: 0,
      completionRate: 0
    },
    showAboutModal: false
  },

  onLoad() {
    this.checkLoginStatus()
  },

  onShow() {
    if (this.data.userInfo) {
      this.loadStatistics()
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = app.globalData.userInfo
    if (userInfo) {
      this.setData({
        userInfo,
        isAdmin: userInfo.role === 'admin' || userInfo.role === 'teacher'
      })
      this.loadStatistics()
    } else {
      wx.redirectTo({
        url: '/pages/login/login'
      })
    }
  },

  // 加载统计信息
  async loadStatistics() {
    try {
      const result = await callCloudFunction({
        name: 'getCheckStatistics',
        data: {
          userId: this.data.userInfo._id
        },
        loading: false
      })

      if (result.success) {
        this.setData({
          statistics: {
            totalTasks: result.total || 0,
            completedTasks: result.completed || 0,
            completionRate: result.completionRate || 0
          }
        })
      }
    } catch (err) {
      console.error('加载统计信息失败:', err)
    }
  },

  // 导航到设置页面
  navigateToSettings() {
    wx.navigateTo({
      url: '/pages/profile/settings/index'
    })
  },

  // 导航到存储管理页面
  navigateToStorageManage() {
    wx.navigateTo({
      url: '/pages/profile/admin/storage'
    })
  },

  // 显示关于弹窗
  showAbout() {
    this.setData({ showAboutModal: true })
  },

  // 隐藏关于弹窗
  hideAbout() {
    this.setData({ showAboutModal: false })
  },

  // 处理退出登录
  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          app.clearUserInfo()
          wx.redirectTo({
            url: '/pages/login/login'
          })
        }
      }
    })
  }
})

