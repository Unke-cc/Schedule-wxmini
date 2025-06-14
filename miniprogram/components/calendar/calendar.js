Component({
  properties: {
    selectedDate: {
      type: String,
      value: ''
    },
    tasks: {
      type: Array,
      value: []
    }
  },

  data: {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    days: [],
    weekDays: ['日', '一', '二', '三', '四', '五', '六']
  },

  lifetimes: {
    attached() {
      this.initCalendar()
    }
  },

  observers: {
    'tasks, selectedDate'() {
      this.initCalendar()
    }
  },

  methods: {
    // 初始化日历数据
    initCalendar() {
      const days = this.calculateDays()
      this.setData({ days })
    },

    // 计算当月天数
    calculateDays() {
      const { year, month } = this.data
      const days = []
      
      // 获取当月第一天是星期几
      const firstDay = new Date(year, month - 1, 1).getDay()
      // 获取当月天数
      const totalDays = new Date(year, month, 0).getDate()
      
      // 补充上月天数
      const lastMonthDays = new Date(year, month - 1, 0).getDate()
      for (let i = firstDay - 1; i >= 0; i--) {
        const date = `${month === 1 ? year - 1 : year}-${String(month === 1 ? 12 : month - 1).padStart(2, '0')}-${String(lastMonthDays - i).padStart(2, '0')}`
        days.push({
          day: lastMonthDays - i,
          isCurrentMonth: false,
          date,
          hasTasks: this.checkHasTasks(date)
        })
      }
      
      // 当月天数
      for (let i = 1; i <= totalDays; i++) {
        const date = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`
        days.push({
          day: i,
          isCurrentMonth: true,
          isToday: this.isToday(year, month, i),
          date,
          hasTasks: this.checkHasTasks(date),
          isSelected: date === this.data.selectedDate
        })
      }
      
      // 补充下月天数
      const remainingDays = 42 - days.length // 保持6行
      for (let i = 1; i <= remainingDays; i++) {
        const date = `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
        days.push({
          day: i,
          isCurrentMonth: false,
          date,
          hasTasks: this.checkHasTasks(date)
        })
      }
      
      return days
    },

    // 检查是否是今天
    isToday(year, month, day) {
      const today = new Date()
      return year === today.getFullYear() &&
        month === today.getMonth() + 1 &&
        day === today.getDate()
    },

    // 检查日期是否有任务
    checkHasTasks(date) {
      return this.data.tasks && this.data.tasks.some(task => task.date === date)
    },

    // 切换月份
    changeMonth(e) {
      const { type } = e.currentTarget.dataset
      let { year, month } = this.data
      
      if (type === 'prev') {
        if (month === 1) {
          year--
          month = 12
        } else {
          month--
        }
      } else {
        if (month === 12) {
          year++
          month = 1
        } else {
          month++
        }
      }
      
      this.setData({ year, month }, () => {
        this.initCalendar()
      })
    },

    // 选择日期
    selectDate(e) {
      const { date } = e.currentTarget.dataset
      this.triggerEvent('select', { date })
    }
  }
}) 