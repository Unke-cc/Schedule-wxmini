const app = getApp()

Page({
  data: {
    username: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    roles: [
      { value: 'student', name: '学生' },
      { value: 'teacher', name: '教师' }
    ],
    name: '',
    loading: false
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

  // 确认密码
  onConfirmPasswordInput(e) {
    this.setData({
      confirmPassword: e.detail.value
    })
  },

  // 输入姓名
  onNameInput(e) {
    this.setData({
      name: e.detail.value
    })
  },

  // 选择角色
  onRoleChange(e) {
    this.setData({
      role: e.detail.value
    })
  },

  // 验证表单
  validateForm() {
    const { username, password, confirmPassword, name } = this.data

    if (!username) {
      wx.showToast({
        title: '请输入用户名',
        icon: 'none'
      })
      return false
    }

    if (!password) {
      wx.showToast({
        title: '请输入密码',
        icon: 'none'
      })
      return false
    }

    if (password.length < 6) {
      wx.showToast({
        title: '密码至少6位',
        icon: 'none'
      })
      return false
    }

    if (password !== confirmPassword) {
      wx.showToast({
        title: '两次密码不一致',
        icon: 'none'
      })
      return false
    }

    if (!name) {
      wx.showToast({
        title: '请输入姓名',
        icon: 'none'
      })
      return false
    }

    return true
  },

  // 注册
  async onRegister() {
    if (!this.validateForm()) return

    this.setData({ loading: true })

    try {
      const { username, password, role, name } = this.data
      const result = await wx.cloud.callFunction({
        name: 'register',
        data: {
          username,
          password,
          role,
          name
        }
      })

      if (result.result.success) {
        wx.showToast({
          title: '注册成功',
          icon: 'success'
        })

        // 如果是教师，跳转到创建班级页面
        if (role === 'teacher') {
          setTimeout(() => {
            wx.redirectTo({
              url: '/pages/class/create/index'
            })
          }, 1500)
        } else {
          // 如果是学生，跳转到加入班级页面
          setTimeout(() => {
            wx.redirectTo({
              url: '/pages/class/join/index'
            })
          }, 1500)
        }
      } else {
        wx.showToast({
          title: result.result.message || '注册失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error(err)
      wx.showToast({
        title: '注册失败，请重试',
        icon: 'none'
      })
    }

    this.setData({ loading: false })
  },

  // 返回登录页
  onBack() {
    wx.navigateBack()
  }
})
