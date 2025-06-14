const app = getApp()

Page({
  data: {
    classCode: '',
    isValidCode: false,
    joining: false,
    applications: [],
    showClassInfo: false,
    classInfo: null
  },

  onLoad() {
    this.loadApplications()
  },

  // 加载申请记录
  async loadApplications() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getJoinApplications',
        data: {
          userId: app.globalData.userInfo._id
        }
      })

      if (res.result && res.result.success) {
        // 格式化时间
        const applications = res.result.applications.map(app => ({
          ...app,
          createTime: this.formatTime(new Date(app.createTime))
        }))
        this.setData({ applications })
      }
    } catch (err) {
      console.error('加载申请记录失败:', err)
    }
  },

  // 格式化时间
  formatTime(date) {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()

    return `${year}-${month}-${day} ${hour}:${minute}`
  },

  // 输入班级码
  onCodeInput(e) {
    const classCode = e.detail.value.toUpperCase()
    this.setData({
      classCode,
      isValidCode: /^[A-Z0-9]{6}$/.test(classCode)
    })
  },

  // 扫码加入
  async scanCode() {
    try {
      const res = await wx.scanCode({
        scanType: ['qrCode']
      })

      if (res.result) {
        // 解析二维码内容，格式：CLASS_CODE:XXXXXX
        const match = res.result.match(/CLASS_CODE:([A-Z0-9]{6})/)
        if (match) {
          this.setData({
            classCode: match[1],
            isValidCode: true
          })
          this.joinClass()
        } else {
          wx.showToast({
            title: '无效的班级码',
            icon: 'none'
          })
        }
      }
    } catch (err) {
      console.error('扫码失败:', err)
    }
  },

  // 加入班级
  async joinClass() {
    if (!this.data.isValidCode) return

    try {
      this.setData({ joining: true })

      // 获取班级信息
      const res = await wx.cloud.callFunction({
        name: 'getClassInfo',
        data: {
          code: this.data.classCode
        }
      })

      if (res.result && res.result.success) {
        this.setData({
          classInfo: res.result.classInfo,
          showClassInfo: true
        })
      } else {
        wx.showToast({
          title: res.result.message || '班级不存在',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('获取班级信息失败:', err)
      wx.showToast({
        title: '加入失败',
        icon: 'none'
      })
    } finally {
      this.setData({ joining: false })
    }
  },

  // 确认加入班级
  async confirmJoin() {
    try {
      this.setData({ joining: true })

      const res = await wx.cloud.callFunction({
        name: 'joinClass',
        data: {
          classId: this.data.classInfo._id,
          userId: app.globalData.userInfo._id
        }
      })

      if (res.result && res.result.success) {
        wx.showToast({
          title: this.data.classInfo.requireApproval ? '申请已提交' : '加入成功',
          icon: 'success'
        })

        // 刷新申请记录
        this.loadApplications()
        
        // 关闭弹窗
        this.hideClassInfo()
        
        // 清空输入
        this.setData({
          classCode: '',
          isValidCode: false
        })

        // 如果不需要审核，直接返回上一页
        if (!this.data.classInfo.requireApproval) {
          setTimeout(() => {
            const pages = getCurrentPages()
            const prevPage = pages[pages.length - 2]
            if (prevPage && prevPage.loadClassList) {
              prevPage.loadClassList()
            }
            wx.navigateBack()
          }, 1500)
        }
      } else {
        wx.showToast({
          title: res.result.message || '加入失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('加入班级失败:', err)
      wx.showToast({
        title: '加入失败',
        icon: 'none'
      })
    } finally {
      this.setData({ joining: false })
    }
  },

  // 隐藏班级信息弹窗
  hideClassInfo() {
    this.setData({
      showClassInfo: false,
      classInfo: null
    })
  },

  // 阻止冒泡
  stopPropagation() {
    // 什么都不做，只阻止事件冒泡
  }
})
