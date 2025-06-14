const app = getApp()

Page({
  data: {
    userInfo: null,
    isTeacher: false,
    currentTab: 'all',
    tasks: [],
    page: 1,
    pageSize: 20,
    hasMore: true
  },

  onLoad() {
    this.checkLoginStatus()
  },

  onShow() {
    if (this.data.userInfo) {
      this.loadTasks(true)
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
      this.loadTasks(true)
    } else {
      wx.redirectTo({
        url: '/pages/login/login'
      })
    }
  },

  // 切换标签
  switchTab(e) {
    const { tab } = e.currentTarget.dataset
    this.setData({
      currentTab: tab,
      page: 1,
      hasMore: true,
      tasks: []
    })
    this.loadTasks(true)
  },

  // 加载任务列表
  async loadTasks(refresh = false) {
    if (refresh) {
      this.setData({
        page: 1,
        tasks: [],
        hasMore: true
      })
    }

    if (!this.data.hasMore) return

    try {
      wx.showLoading({
        title: '加载中'
      })

      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      let query = {
        userId: this.data.userInfo._id,
        page: this.data.page,
        pageSize: this.data.pageSize
      }

      // 根据当前标签设置查询条件
      switch (this.data.currentTab) {
        case 'today':
          query.startDate = todayStr
          query.endDate = todayStr
          break
        case 'upcoming':
          query.startDate = todayStr
          query.status = 'pending'
          break
        case 'completed':
          query.status = 'completed'
          break
      }

      const res = await wx.cloud.callFunction({
        name: 'getTaskList',
        data: query
      })

      if (res.result && res.result.success) {
        const newTasks = res.result.tasks.map(task => {
          const startTime = new Date(task.startTime)
          const endTime = new Date(task.endTime)
          const now = new Date()

          if (task.status === 'completed') {
            task.statusText = '已完成'
            task.statusClass = 'completed'
          } else if (now < startTime) {
            task.statusText = '待开始'
            task.statusClass = 'pending'
          } else if (now > endTime) {
            task.statusText = '已过期'
            task.statusClass = 'expired'
          } else {
            task.statusText = '进行中'
            task.statusClass = 'ongoing'
          }

          task.startTimeStr = startTime.toLocaleString('zh-CN', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
          task.endTimeStr = endTime.toLocaleString('zh-CN', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })

          return task
        })

        this.setData({
          tasks: [...this.data.tasks, ...newTasks],
          page: this.data.page + 1,
          hasMore: newTasks.length === this.data.pageSize
        })
      }
    } catch (err) {
      console.error('加载任务失败:', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 跳转到任务详情
  goToTaskDetail(e) {
    const { taskid } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/tasks/detail/index?id=${taskid}`
    })
  },

  // 快速打卡
  async quickCheckIn(e) {
    const { taskid } = e.currentTarget.dataset
    try {
      wx.showLoading({
        title: '打卡中'
      })

      const res = await wx.cloud.callFunction({
        name: 'checkIn',
        data: {
          taskId: taskid,
          userId: this.data.userInfo._id
        }
      })

      if (res.result && res.result.success) {
        wx.showToast({
          title: '打卡成功',
          icon: 'success'
        })
        this.loadTasks(true)
      } else {
        wx.showToast({
          title: res.result.message || '打卡失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('打卡失败:', err)
      wx.showToast({
        title: '打卡失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 创建任务（教师功能）
  createTask() {
    if (!this.data.isTeacher) {
      wx.showToast({
        title: '仅教师可创建任务',
        icon: 'none'
      })
      return
    }
    
    wx.navigateTo({
      url: '/pages/tasks/create/index'
    })
  },

  // 加载更多
  loadMore() {
    if (this.data.hasMore) {
      this.loadTasks()
    }
  },

  // 下拉刷新
  async onPullDownRefresh() {
    try {
      await this.loadTasks(true)
    } finally {
      wx.stopPullDownRefresh()
    }
  }
})
