// pages/index/index.js
const app = getApp()

Page({
  data: {
    userInfo: null,
    isTeacher: false,
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    calendarData: [],
    selectedDate: '',
    selectedDateStr: '今日',
    tasks: [],
    todayTasks: [],
    completedTasks: 0,
    pendingTasks: 0
  },

  onLoad() {
    this.checkLoginStatus()
  },

  onShow() {
    if (this.data.userInfo) {
      this.loadMonthTasks()
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
      this.loadMonthTasks()
    } else {
      wx.redirectTo({
        url: '/pages/login/login'
      })
    }
  },

  // 加载当月任务
  async loadMonthTasks() {
    try {
      const { currentYear, currentMonth } = this.data
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(new Date(currentYear, currentMonth, 0).getDate()).padStart(2, '0')}`

      const res = await wx.cloud.callFunction({
        name: 'getTaskList',
        data: {
          startDate,
          endDate,
          userId: this.data.userInfo._id
        }
      })

      if (res.result && res.result.success) {
        const tasks = res.result.tasks.map(task => ({
          ...task,
          date: new Date(task.startTime).toISOString().split('T')[0]
        }))

        // 获取今日任务
        const today = new Date().toISOString().split('T')[0]
        const todayTasks = tasks.filter(task => task.date === today)
        
        // 计算完成和待完成任务数
        const completedTasks = tasks.filter(task => task.status === 'completed').length
        const pendingTasks = tasks.length - completedTasks

        this.setData({
          tasks,
          todayTasks,
          completedTasks,
          pendingTasks
        })
      }
    } catch (err) {
      console.error('加载任务失败:', err)
      wx.showToast({
        title: '加载任务失败',
        icon: 'none'
      })
    }
  },

  // 日期选择处理
  onDateSelect(e) {
    const { date } = e.detail
    const selectedTasks = this.data.tasks.filter(task => 
      task.date === date
    )
    
    this.setData({
      selectedDate: date,
      selectedDateStr: this.formatSelectedDate(date),
      selectedTasks
    })
  },

  // 格式化选中日期显示
  formatSelectedDate(dateStr) {
    const date = new Date(dateStr)
    const today = new Date()
    
    if (date.toDateString() === today.toDateString()) {
      return '今日'
    }
    
    return date.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric'
    })
  },

  // 跳转到任务详情
  navigateToDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/tasks/detail/index?id=${id}`
    })
  }
})