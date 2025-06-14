const app = getApp()

Page({
  data: {
    taskId: '',
    isTeacher: false,
    taskInfo: null,
    records: [],
    showLocationModal: false,
    currentLocation: {
      latitude: null,
      longitude: null,
      address: '',
      distance: null
    },
    locationMarkers: [],
    isValidLocation: false,
    checkBtnDisabled: false,
    checkBtnText: '立即打卡'
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        taskId: options.id,
        isTeacher: app.globalData.userInfo.role === 'teacher'
      })
      this.loadTaskInfo()
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'error'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  onShow() {
    // 刷新打卡记录
    this.loadRecords()
  },

  // 加载任务信息
  async loadTaskInfo() {
    try {
      wx.showLoading({ title: '加载中' })

      const res = await wx.cloud.callFunction({
        name: 'getTaskDetail',
        data: {
          taskId: this.data.taskId
        }
      })

      if (res.result && res.result.success) {
        const taskInfo = {
          ...res.result.taskInfo,
          statusText: this.getStatusText(res.result.taskInfo.status)
        }

        this.setData({
          taskInfo,
          locationMarkers: taskInfo.location.required ? [{
            id: 1,
            latitude: taskInfo.location.latitude,
            longitude: taskInfo.location.longitude,
            title: taskInfo.location.address,
            iconPath: '/images/icons/location.png',
            width: 32,
            height: 32
          }] : []
        })

        // 检查打卡状态
        if (!this.data.isTeacher) {
          this.checkStatus()
        }
      } else {
        throw new Error(res.result.message || '加载失败')
      }
    } catch (err) {
      console.error('加载任务信息失败:', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 加载打卡记录
  async loadRecords() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getCheckRecords',
        data: {
          taskId: this.data.taskId,
          userId: this.data.isTeacher ? null : app.globalData.userInfo._id
        }
      })

      if (res.result && res.result.success) {
        // 格式化记录
        const records = res.result.records.map(record => ({
          ...record,
          statusText: this.getCheckStatusText(record.status),
          checkTime: this.formatTime(new Date(record.checkTime))
        }))
        this.setData({ records })
      }
    } catch (err) {
      console.error('加载打卡记录失败:', err)
    }
  },

  // 检查打卡状态
  checkStatus() {
    const { taskInfo, records } = this.data
    const now = new Date()
    const startTime = new Date(taskInfo.startTime)
    const endTime = new Date(taskInfo.endTime)

    let btnText = '立即打卡'
    let disabled = false

    if (now < startTime) {
      btnText = '未开始'
      disabled = true
    } else if (now > endTime) {
      btnText = '已结束'
      disabled = true
    } else if (records.length > 0) {
      btnText = '已打卡'
      disabled = true
    }

    this.setData({
      checkBtnText: btnText,
      checkBtnDisabled: disabled
    })
  },

  // 打卡操作
  async checkIn() {
    const { taskInfo } = this.data

    // 如果需要位置信息
    if (taskInfo.location.required) {
      try {
        // 获取位置权限
        const setting = await wx.getSetting()
        if (!setting.authSetting['scope.userLocation']) {
          await wx.authorize({ scope: 'scope.userLocation' })
        }

        // 获取当前位置
        const location = await wx.getLocation({
          type: 'gcj02'
        })

        // 获取位置详细信息
        const res = await wx.reverseGeocoder({
          location: {
            latitude: location.latitude,
            longitude: location.longitude
          }
        })

        // 计算与打卡点的距离
        const distance = this.calculateDistance(
          location.latitude,
          location.longitude,
          taskInfo.location.latitude,
          taskInfo.location.longitude
        )

        this.setData({
          currentLocation: {
            latitude: location.latitude,
            longitude: location.longitude,
            address: res.address,
            distance: Math.round(distance)
          },
          isValidLocation: distance <= taskInfo.location.radius,
          showLocationModal: true
        })
      } catch (err) {
        console.error('获取位置信息失败:', err)
        wx.showToast({
          title: '获取位置失败',
          icon: 'none'
        })
      }
    } else {
      this.submitCheckIn()
    }
  },

  // 提交打卡
  async submitCheckIn() {
    try {
      wx.showLoading({ title: '打卡中' })

      const checkData = {
        taskId: this.data.taskId,
        userId: app.globalData.userInfo._id
      }

      // 如果需要位置信息，添加位置数据
      if (this.data.taskInfo.location.required) {
        checkData.location = {
          latitude: this.data.currentLocation.latitude,
          longitude: this.data.currentLocation.longitude,
          address: this.data.currentLocation.address
        }
      }

      const res = await wx.cloud.callFunction({
        name: 'checkIn',
        data: checkData
      })

      if (res.result && res.result.success) {
        wx.showToast({
          title: '打卡成功',
          icon: 'success'
        })
        this.hideLocationModal()
        this.loadRecords()
      } else {
        throw new Error(res.result.message || '打卡失败')
      }
    } catch (err) {
      console.error('打卡失败:', err)
      wx.showToast({
        title: err.message || '打卡失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 导出记录
  async exportRecords() {
    try {
      wx.showLoading({ title: '导出中' })

      const res = await wx.cloud.callFunction({
        name: 'exportCheckRecords',
        data: {
          taskId: this.data.taskId
        }
      })

      if (res.result && res.result.success) {
        // 复制文件链接
        await wx.setClipboardData({
          data: res.result.fileUrl
        })

        wx.showToast({
          title: '导出成功，链接已复制',
          icon: 'success'
        })
      } else {
        throw new Error(res.result.message || '导出失败')
      }
    } catch (err) {
      console.error('导出记录失败:', err)
      wx.showToast({
        title: '导出失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 隐藏位置选择弹窗
  hideLocationModal() {
    this.setData({ showLocationModal: false })
  },

  // 确认位置
  confirmLocation() {
    if (this.data.isValidLocation) {
      this.submitCheckIn()
    }
  },

  // 获取任务状态文本
  getStatusText(status) {
    const statusMap = {
      'pending': '未开始',
      'ongoing': '进行中',
      'completed': '已结束',
      'expired': '已过期'
    }
    return statusMap[status] || status
  },

  // 获取打卡状态文本
  getCheckStatusText(status) {
    const statusMap = {
      'normal': '正常',
      'late': '迟到',
      'early': '早退'
    }
    return statusMap[status] || status
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

  // 计算两点之间的距离（米）
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000 // 地球半径（米）
    const dLat = this.toRad(lat2 - lat1)
    const dLon = this.toRad(lon2 - lon1)
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  },

  // 角度转弧度
  toRad(degrees) {
    return degrees * Math.PI / 180
  },

  // 阻止冒泡
  stopPropagation() {
    // 什么都不做，只阻止事件冒泡
  },

  // 下拉刷新
  async onPullDownRefresh() {
    try {
      await Promise.all([
        this.loadTaskInfo(),
        this.loadRecords()
      ])
    } finally {
      wx.stopPullDownRefresh()
    }
  }
})
