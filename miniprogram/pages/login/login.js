const { callCloudFunction, showError } = require('../../utils/request')
const app = getApp()

Page({
  data: {
    username: '',
    password: '',
    isLoading: false
  },

  // 输入用户名
  onUsernameInput(e) {
    this.setData({
      username: e.detail.value
    })
  },

  // 输入密码
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    })
  },

  // 处理登录
  async handleLogin() {
    const { username, password } = this.data

    if (!username || !password) {
      showError('请输入用户名和密码')
      return
    }

    this.setData({ isLoading: true })

    try {
      const result = await callCloudFunction({
        name: 'login',
        data: {
          username,
          password
        },
        loading: false
      })

      if (result.success) {
        // 保存用户信息
        app.setUserInfo(result.data)
        
        // 跳转到首页
        wx.switchTab({
          url: '/pages/index/index'
        })
      } else {
        showError(result.message)
      }
    } catch (err) {
      console.error('登录失败:', err)
      showError('登录失败，请稍后重试')
    } finally {
      this.setData({ isLoading: false })
    }
  },

  // 跳转到注册页面
  navigateToRegister() {
    wx.navigateTo({
      url: '/pages/register/register'
    })
  }
})
