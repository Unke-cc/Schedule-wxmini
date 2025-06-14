const app = getApp()

Page({
  data: {
    userInfo: null,
    formData: {
      title: '',
      description: '',
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      location: ''
    },
    classes: [], // 教师的班级列表
    selectedClass: null, // 选中的班级对象
    submitting: false
  },

  onLoad() {
    const userInfo = app.globalData.userInfo
    console.log('[createTask] 页面加载, 用户信息:', userInfo)

    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }

    if (userInfo.role !== 'teacher') {
      wx.showToast({
        title: '只有教师可以创建任务',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }

    // 设置默认日期和时间
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    
    this.setData({
      userInfo,
      'formData.startDate': today,
      'formData.startTime': currentTime,
      'formData.endDate': today,
      'formData.endTime': currentTime
    })

    // 加载教师的班级列表
    this.loadTeacherClasses()
  },

  // 加载教师的班级列表
  async loadTeacherClasses() {
    try {
      wx.showLoading({ title: '加载中' })
      const res = await wx.cloud.callFunction({
        name: 'getTeacherClasses',
        data: {
          userId: this.data.userInfo._id
        }
      })

      console.log('[createTask] 获取班级列表结果:', res)

      if (res.result && res.result.success) {
        const classes = res.result.classes || []
        console.log('[createTask] 班级列表:', classes)
        this.setData({ classes })
      } else {
        throw new Error(res.result?.message || '加载班级失败')
      }
    } catch (err) {
      console.error('[createTask] 加载班级列表失败:', err)
      wx.showToast({
        title: err.message || '加载班级失败',
        icon: 'none',
        duration: 2000
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 班级选择处理
  onClassChange(e) {
    const index = parseInt(e.detail.value)
    const selectedClass = this.data.classes[index]
    console.log('[createTask] 选择班级:', selectedClass)
    this.setData({ selectedClass })
  },

  // 输入处理函数
  onTitleInput(e) {
    this.setData({ 'formData.title': e.detail.value })
  },

  onDescriptionInput(e) {
    this.setData({ 'formData.description': e.detail.value })
  },

  onStartDateChange(e) {
    this.setData({ 'formData.startDate': e.detail.value })
  },

  onStartTimeChange(e) {
    this.setData({ 'formData.startTime': e.detail.value })
  },

  onEndDateChange(e) {
    this.setData({ 'formData.endDate': e.detail.value })
  },

  onEndTimeChange(e) {
    this.setData({ 'formData.endTime': e.detail.value })
  },

  onLocationInput(e) {
    this.setData({ 'formData.location': e.detail.value })
  },

  // 表单提交
  async handleSubmit() {
    try {
      // 防止重复提交
      if (this.data.submitting) {
        return
      }

      const { formData, userInfo, selectedClass } = this.data
      console.log('[createTask] 开始提交任务, 表单数据:', formData)

      // 验证用户信息
      if (!userInfo || !userInfo._id) {
        throw new Error('用户信息无效，请重新登录')
      }

      // 验证表单
      if (!formData.title.trim()) {
        throw new Error('请输入任务标题')
      }

      if (!selectedClass) {
        throw new Error('请选择班级')
      }

      // 构建开始和结束时间
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}:00`)
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}:00`)

      if (endDateTime <= startDateTime) {
        throw new Error('结束时间必须晚于开始时间')
      }

      // 设置提交状态
      this.setData({ submitting: true })
      wx.showLoading({ title: '创建中' })

      // 构建任务数据
      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        location: formData.location.trim(),
        creatorId: userInfo._id,
        classId: selectedClass._id
      }

      console.log('[createTask] 调用云函数, 任务数据:', taskData)

      // 调用云函数
      const res = await wx.cloud.callFunction({
        name: 'createTask',
        data: taskData
      })

      console.log('[createTask] 云函数返回结果:', res)

      if (!res.result) {
        throw new Error('创建失败：云函数未返回结果')
      }

      if (!res.result.success) {
        throw new Error(res.result.message || '创建失败')
      }

      wx.showToast({
        title: '创建成功',
        icon: 'success'
      })

      // 返回上一页并刷新列表
      setTimeout(() => {
        const pages = getCurrentPages()
        const prevPage = pages[pages.length - 2]
        if (prevPage && prevPage.loadTasks) {
          prevPage.loadTasks(true)
        }
        wx.navigateBack()
      }, 1500)
    } catch (err) {
      console.error('[createTask] 创建任务失败:', err)
      wx.showToast({
        title: err.message || '创建失败',
        icon: 'none',
        duration: 2000
      })
    } finally {
      wx.hideLoading()
      this.setData({ submitting: false })
    }
  }
}) 