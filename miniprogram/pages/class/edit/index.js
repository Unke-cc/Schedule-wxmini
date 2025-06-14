const app = getApp()

Page({
  data: {
    classId: '',
    formData: {
      name: '',
      description: '',
      courseName: '',
      courseCode: '',
      classTimes: [],
      allowJoin: true,
      requireApproval: false,
      hasMembers: false
    },
    years: [],
    yearIndex: 0,
    terms: ['第一学期', '第二学期'],
    termIndex: 0,
    weekdays: ['一', '二', '三', '四', '五', '六', '日'],
    showTimeModal: false,
    showDeleteModal: false,
    tempTime: {
      weekdayIndex: 0,
      startTime: '',
      endTime: '',
      location: ''
    }
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ classId: options.id })
      this.initYears()
      this.loadClassInfo()
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

  // 初始化学年选项
  initYears() {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let i = 0; i < 4; i++) {
      years.push(`${currentYear + i}-${currentYear + i + 1}`)
    }
    this.setData({ years })
  },

  // 加载班级信息
  async loadClassInfo() {
    try {
      wx.showLoading({ title: '加载中' })

      const res = await wx.cloud.callFunction({
        name: 'getClassDetail',
        data: {
          classId: this.data.classId
        }
      })

      if (res.result && res.result.success) {
        const classInfo = res.result.classInfo
        
        // 设置学年索引
        const yearIndex = this.data.years.findIndex(year => year === classInfo.year)
        
        // 设置学期索引
        const termIndex = this.data.terms.findIndex(term => term === classInfo.term)

        this.setData({
          formData: {
            name: classInfo.name,
            description: classInfo.description || '',
            courseName: classInfo.courseName,
            courseCode: classInfo.courseCode || '',
            classTimes: classInfo.classTimes || [],
            allowJoin: classInfo.allowJoin,
            requireApproval: classInfo.requireApproval,
            hasMembers: classInfo.studentCount > 0
          },
          yearIndex: yearIndex !== -1 ? yearIndex : 0,
          termIndex: termIndex !== -1 ? termIndex : 0
        })
      } else {
        throw new Error(res.result.message || '加载失败')
      }
    } catch (err) {
      console.error('加载班级信息失败:', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
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

      wx.showLoading({ title: '保存中' })

      // 构建班级数据
      const classData = {
        classId: this.data.classId,
        name: formData.name.trim(),
        description: formData.description.trim(),
        courseName: formData.courseName.trim(),
        courseCode: formData.courseCode.trim(),
        year: years[yearIndex],
        term: terms[termIndex],
        classTimes: formData.classTimes,
        allowJoin: formData.allowJoin,
        requireApproval: formData.requireApproval
      }

      // 调用云函数更新班级
      const res = await wx.cloud.callFunction({
        name: 'updateClass',
        data: classData
      })

      if (!res.result.success) {
        throw new Error(res.result.message || '保存失败')
      }

      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })

      // 返回上一页并刷新
      setTimeout(() => {
        const pages = getCurrentPages()
        const prevPage = pages[pages.length - 2]
        if (prevPage && prevPage.loadClassInfo) {
          prevPage.loadClassInfo()
        }
        wx.navigateBack()
      }, 1500)

    } catch (err) {
      console.error('保存班级失败:', err)
      wx.showToast({
        title: err.message || '保存失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 删除班级
  deleteClass() {
    this.setData({ showDeleteModal: true })
  },

  hideDeleteModal() {
    this.setData({ showDeleteModal: false })
  },

  async confirmDelete() {
    try {
      wx.showLoading({ title: '删除中' })

      const res = await wx.cloud.callFunction({
        name: 'deleteClass',
        data: {
          classId: this.data.classId
        }
      })

      if (!res.result.success) {
        throw new Error(res.result.message || '删除失败')
      }

      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })

      // 返回班级列表页面
      setTimeout(() => {
        const pages = getCurrentPages()
        const managePage = pages.find(page => page.route === 'pages/class/manage/index')
        if (managePage && managePage.loadClassList) {
          managePage.loadClassList()
        }
        wx.navigateBack({
          delta: 2 // 返回到班级列表页面
        })
      }, 1500)

    } catch (err) {
      console.error('删除班级失败:', err)
      wx.showToast({
        title: err.message || '删除失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
      this.hideDeleteModal()
    }
  }
}) 