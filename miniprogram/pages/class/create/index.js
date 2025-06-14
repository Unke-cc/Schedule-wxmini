const app = getApp()

Page({
  data: {
    formData: {
      name: '',
      description: '',
      courseName: '',
      courseCode: '',
      classTimes: [],
      allowJoin: true,
      requireApproval: false
    },
    years: [],
    yearIndex: 0,
    terms: ['第一学期', '第二学期'],
    termIndex: 0,
    weekdays: ['一', '二', '三', '四', '五', '六', '日'],
    showTimeModal: false,
    tempTime: {
      weekdayIndex: 0,
      startTime: '',
      endTime: '',
      location: ''
    }
  },

  onLoad() {
    this.initYears()
  },

  // 初始化学年选项
  initYears() {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let i = 0; i < 4; i++) {
      years.push(`${currentYear + i}-${currentYear + i + 1}`)
    }
    this.setData({ years })
  },

  // 学年选择
  onYearChange(e) {
    this.setData({ yearIndex: e.detail.value })
  },

  // 学期选择
  onTermChange(e) {
    this.setData({ termIndex: e.detail.value })
  },

  // 开关控制
  onAllowJoinChange(e) {
    this.setData({ 'formData.allowJoin': e.detail.value })
  },

  onRequireApprovalChange(e) {
    this.setData({ 'formData.requireApproval': e.detail.value })
  },

  // 上课时间相关
  addClassTime() {
    this.setData({
      showTimeModal: true,
      tempTime: {
        weekdayIndex: 0,
        startTime: '',
        endTime: '',
        location: ''
      }
    })
  },

  hideTimeModal() {
    this.setData({ showTimeModal: false })
  },

  stopPropagation() {
    // 阻止事件冒泡
  },

  onWeekdayChange(e) {
    this.setData({ 'tempTime.weekdayIndex': e.detail.value })
  },

  onModalStartTimeChange(e) {
    this.setData({ 'tempTime.startTime': e.detail.value })
  },

  onModalEndTimeChange(e) {
    this.setData({ 'tempTime.endTime': e.detail.value })
  },

  onLocationInput(e) {
    this.setData({ 'tempTime.location': e.detail.value })
  },

  confirmAddTime() {
    const { tempTime } = this.data
    
    // 验证时间
    if (!tempTime.startTime || !tempTime.endTime) {
      wx.showToast({
        title: '请选择时间',
        icon: 'none'
      })
      return
    }

    // 验证地点
    if (!tempTime.location.trim()) {
      wx.showToast({
        title: '请输入上课地点',
        icon: 'none'
      })
      return
    }

    // 添加时间
    const newTime = {
      weekday: this.data.weekdays[tempTime.weekdayIndex],
      startTime: tempTime.startTime,
      endTime: tempTime.endTime,
      location: tempTime.location.trim()
    }

    const classTimes = [...this.data.formData.classTimes, newTime]
    this.setData({
      'formData.classTimes': classTimes,
      showTimeModal: false
    })
  },

  deleteClassTime(e) {
    const index = e.currentTarget.dataset.index
    const classTimes = [...this.data.formData.classTimes]
    classTimes.splice(index, 1)
    this.setData({ 'formData.classTimes': classTimes })
  },

  // 表单提交
  async handleSubmit(e) {
    try {
      const { formData, years, yearIndex, terms, termIndex } = this.data
      
      // 验证必填字段
      if (!formData.name.trim()) {
        throw new Error('请输入班级名称')
      }
      if (!formData.courseName.trim()) {
        throw new Error('请输入课程名称')
      }
      if (formData.classTimes.length === 0) {
        throw new Error('请添加上课时间')
      }

      wx.showLoading({ title: '创建中' })

      // 构建班级数据
      const classData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        courseName: formData.courseName.trim(),
        courseCode: formData.courseCode.trim(),
        year: years[yearIndex],
        term: terms[termIndex],
        classTimes: formData.classTimes,
        allowJoin: formData.allowJoin,
        requireApproval: formData.requireApproval,
        creatorId: app.globalData.userInfo._id
      }

      // 调用云函数创建班级
      const res = await wx.cloud.callFunction({
        name: 'createClass',
        data: classData
      })

      if (!res.result.success) {
        throw new Error(res.result.message || '创建失败')
      }

      wx.showToast({
        title: '创建成功',
        icon: 'success'
      })

      // 返回上一页并刷新班级列表
      setTimeout(() => {
        const pages = getCurrentPages()
        const prevPage = pages[pages.length - 2]
        if (prevPage && prevPage.loadClassList) {
          prevPage.loadClassList()
        }
        wx.navigateBack()
      }, 1500)

    } catch (err) {
      console.error('创建班级失败:', err)
      wx.showToast({
        title: err.message || '创建失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  }
})
