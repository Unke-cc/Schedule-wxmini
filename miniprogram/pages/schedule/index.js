const app = getApp()

Page({
  data: {
    userInfo: null,
    isTeacher: false,
    className: '计科2403',
    termName: '第一学期',
    weekdays: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    dates: [],
    currentWeek: 1,
    timeSlots: [
      { number: '1', time: '08:20\n09:05' },
      { number: '2', time: '09:05\n09:50' },
      { number: '3', time: '10:05\n10:50' },
      { number: '4', time: '10:50\n11:35' },
      { number: '5', time: '12:55\n13:40' },
      { number: '6', time: '13:40\n14:25' },
      { number: '7', time: '14:40\n15:25' },
      { number: '8', time: '15:25\n16:10' },
      { number: '9', time: '17:30\n18:15' },
      { number: '10', time: '18:15\n20:00' }
    ],
    courseMatrix: [], // 10x7的课程矩阵
    selectedCourse: null
  },

  onLoad() {
    this.checkLoginStatus()
  },

  onShow() {
    if (this.data.userInfo) {
      this.initDates()
      this.loadSchedule()
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
      this.initDates()
      this.loadSchedule()
    } else {
      wx.redirectTo({
        url: '/pages/login/login'
      })
    }
  },

  // 初始化日期
  initDates() {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1)
    
    const dates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      const month = date.getMonth() + 1
      const day = date.getDate()
      dates.push(`${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`)
    }

    this.setData({ dates })
  },

  // 加载课程表
  async loadSchedule() {
    try {
      wx.showLoading({
        title: '加载中'
      })

      const res = await wx.cloud.callFunction({
        name: 'getSchedule',
        data: {
          userId: this.data.userInfo._id,
          week: this.data.currentWeek
        }
      })

      if (res.result && res.result.success) {
        // 初始化课程矩阵
        const courseMatrix = Array(10).fill(null).map(() => Array(7).fill(null))

        // 填充课程信息
        res.result.schedule.forEach(course => {
          const timeIndex = this.getTimeSlotIndex(course.startTime)
          const dayIndex = this.getDayIndex(course.weekday)
          if (timeIndex !== -1) {
            courseMatrix[timeIndex][dayIndex] = {
              id: course._id,
              name: course.courseName,
              location: course.location,
              teacher: course.teacherName,
              className: course.className,
              time: `${course.startTime}-${course.endTime}`,
              type: course.type || 'default'
            }
          }
        })

        this.setData({ courseMatrix })
      }
    } catch (err) {
      console.error('加载课程表失败:', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 获取时间段索引
  getTimeSlotIndex(time) {
    const timeMap = {
      '08:20': 0,
      '09:05': 1,
      '10:05': 2,
      '10:50': 3,
      '12:55': 4,
      '13:40': 5,
      '14:40': 6,
      '15:25': 7,
      '17:30': 8,
      '18:15': 9
    }
    return timeMap[time] || -1
  },

  // 获取星期索引（周一为0）
  getDayIndex(weekday) {
    return weekday - 1
  },

  // 刷新课程表
  refreshSchedule() {
    this.loadSchedule()
  },

  // 显示时间表
  showTimeTable() {
    wx.showModal({
      title: '作息时间',
      content: this.data.timeSlots.map(slot => 
        `第${slot.number}节：${slot.time.replace('\n', '-')}`
      ).join('\n'),
      showCancel: false
    })
  },

  // 显示课程详情
  showCourseDetail(e) {
    const { course } = e.currentTarget.dataset
    if (course) {
      this.setData({
        selectedCourse: course
      })
    }
  },

  // 隐藏课程详情
  hideCourseDetail() {
    this.setData({
      selectedCourse: null
    })
  },

  // 阻止冒泡
  stopPropagation() {
    // 什么都不做，只阻止事件冒泡
  },

  // 下拉刷新
  async onPullDownRefresh() {
    try {
      await this.loadSchedule()
    } finally {
      wx.stopPullDownRefresh()
    }
  }
})
