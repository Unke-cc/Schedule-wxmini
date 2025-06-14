const app = getApp()

Page({
  data: {
    userInfo: null,
    isTeacher: false,
    createdClasses: [],
    joinedClasses: []
  },

  onLoad() {
    this.checkLoginStatus()
  },

  onShow() {
    if (this.data.userInfo) {
      this.loadClassList()
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = app.globalData.userInfo
    if (userInfo) {
      this.setData({
        userInfo,
        isTeacher: userInfo.role === 'teacher'
      })
      this.loadClassList()
    } else {
      wx.redirectTo({
        url: '/pages/login/login'
      })
    }
  },

  // 加载班级列表
  async loadClassList() {
    try {
      wx.showLoading({ title: '加载中' })

      const res = await wx.cloud.callFunction({
        name: 'getClassList',
        data: {
          userId: this.data.userInfo._id
        }
      })

      if (res.result && res.result.success) {
        this.setData({
          createdClasses: res.result.createdClasses || [],
          joinedClasses: res.result.joinedClasses || []
        })
      } else {
        throw new Error(res.result.message || '加载失败')
      }

    } catch (err) {
      console.error('加载班级列表失败:', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 创建班级
  createClass() {
    wx.navigateTo({
      url: '/pages/class/create/index'
    })
  },

  // 加入班级
  joinClass() {
    wx.navigateTo({
      url: '/pages/class/join/index'
    })
  },

  // 查看班级详情
  goToClassDetail(e) {
    const classId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/class/detail/index?id=${classId}`
    })
  },

  // 下拉刷新
  async onPullDownRefresh() {
    try {
      await this.loadClassList()
    } finally {
      wx.stopPullDownRefresh()
    }
  }
}) 