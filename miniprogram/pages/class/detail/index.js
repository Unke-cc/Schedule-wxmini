const app = getApp()

Page({
  data: {
    classId: '',
    isTeacher: false,
    classInfo: null,
    members: [],
    pendingMembers: [],
    showDeleteModal: false,
    showRemoveModal: false,
    showNoticeModal: false,
    removeUserId: '',
    removeReason: '',
    editingNotice: ''
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        classId: options.id,
        isTeacher: app.globalData.userInfo.role === 'teacher'
      })
      this.loadClassInfo()
      this.loadMembers()
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
        // 格式化时间
        const classInfo = {
          ...res.result.classInfo,
          createTime: this.formatTime(new Date(res.result.classInfo.createTime)),
          noticeTime: res.result.classInfo.noticeTime ? 
            this.formatTime(new Date(res.result.classInfo.noticeTime)) : null
        }

        this.setData({ classInfo })
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

  // 加载成员列表
  async loadMembers() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getClassMembers',
        data: {
          classId: this.data.classId
        }
      })

      if (res.result && res.result.success) {
        // 格式化时间
        const members = res.result.members.map(member => ({
          ...member,
          joinTime: this.formatTime(new Date(member.joinTime))
        }))

        const pendingMembers = res.result.pendingMembers.map(member => ({
          ...member,
          applyTime: this.formatTime(new Date(member.applyTime))
        }))

        this.setData({
          members,
          pendingMembers
        })
      }
    } catch (err) {
      console.error('加载成员列表失败:', err)
    }
  },

  // 复制班级码
  copyClassCode() {
    wx.setClipboardData({
      data: this.data.classInfo.code,
      success: () => {
        wx.showToast({
          title: '已复制',
          icon: 'success'
        })
      }
    })
  },

  // 编辑班级
  editClass() {
    wx.navigateTo({
      url: `/pages/class/edit/index?id=${this.data.classId}`
    })
  },

  // 显示删除确认弹窗
  showDeleteConfirm() {
    this.setData({ showDeleteModal: true })
  },

  // 隐藏删除确认弹窗
  hideDeleteModal() {
    this.setData({ showDeleteModal: false })
  },

  // 删除班级
  async deleteClass() {
    try {
      wx.showLoading({ title: '删除中' })

      const res = await wx.cloud.callFunction({
        name: 'deleteClass',
        data: {
          classId: this.data.classId
        }
      })

      if (res.result && res.result.success) {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        })

        // 返回上一页并刷新
        setTimeout(() => {
          const pages = getCurrentPages()
          const prevPage = pages[pages.length - 2]
          if (prevPage && prevPage.loadClassList) {
            prevPage.loadClassList()
          }
          wx.navigateBack()
        }, 1500)
      } else {
        throw new Error(res.result.message || '删除失败')
      }
    } catch (err) {
      console.error('删除班级失败:', err)
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
      this.hideDeleteModal()
    }
  },

  // 通过成员申请
  async approveMember(e) {
    const userId = e.currentTarget.dataset.id
    try {
      wx.showLoading({ title: '处理中' })

      const res = await wx.cloud.callFunction({
        name: 'approveMember',
        data: {
          classId: this.data.classId,
          userId
        }
      })

      if (res.result && res.result.success) {
        wx.showToast({
          title: '已通过',
          icon: 'success'
        })
        this.loadMembers()
      } else {
        throw new Error(res.result.message || '操作失败')
      }
    } catch (err) {
      console.error('通过申请失败:', err)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 拒绝成员申请
  async rejectMember(e) {
    const userId = e.currentTarget.dataset.id
    try {
      wx.showLoading({ title: '处理中' })

      const res = await wx.cloud.callFunction({
        name: 'rejectMember',
        data: {
          classId: this.data.classId,
          userId
        }
      })

      if (res.result && res.result.success) {
        wx.showToast({
          title: '已拒绝',
          icon: 'success'
        })
        this.loadMembers()
      } else {
        throw new Error(res.result.message || '操作失败')
      }
    } catch (err) {
      console.error('拒绝申请失败:', err)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 显示移除成员确认弹窗
  showRemoveConfirm(e) {
    this.setData({
      showRemoveModal: true,
      removeUserId: e.currentTarget.dataset.id,
      removeReason: ''
    })
  },

  // 隐藏移除成员确认弹窗
  hideRemoveModal() {
    this.setData({
      showRemoveModal: false,
      removeUserId: '',
      removeReason: ''
    })
  },

  // 移除原因输入
  onReasonInput(e) {
    this.setData({
      removeReason: e.detail.value
    })
  },

  // 移除成员
  async removeMember() {
    try {
      wx.showLoading({ title: '处理中' })

      const res = await wx.cloud.callFunction({
        name: 'removeMember',
        data: {
          classId: this.data.classId,
          userId: this.data.removeUserId,
          reason: this.data.removeReason
        }
      })

      if (res.result && res.result.success) {
        wx.showToast({
          title: '已移除',
          icon: 'success'
        })
        this.loadMembers()
      } else {
        throw new Error(res.result.message || '操作失败')
      }
    } catch (err) {
      console.error('移除成员失败:', err)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
      this.hideRemoveModal()
    }
  },

  // 显示编辑公告弹窗
  editNotice() {
    this.setData({
      showNoticeModal: true,
      editingNotice: this.data.classInfo.notice || ''
    })
  },

  // 隐藏编辑公告弹窗
  hideNoticeModal() {
    this.setData({
      showNoticeModal: false,
      editingNotice: ''
    })
  },

  // 公告内容输入
  onNoticeInput(e) {
    this.setData({
      editingNotice: e.detail.value
    })
  },

  // 保存公告
  async saveNotice() {
    try {
      wx.showLoading({ title: '保存中' })

      const res = await wx.cloud.callFunction({
        name: 'updateClass',
        data: {
          classId: this.data.classId,
          updateData: {
            notice: this.data.editingNotice,
            noticeTime: new Date()
          }
        }
      })

      if (res.result && res.result.success) {
        wx.showToast({
          title: '已保存',
          icon: 'success'
        })
        this.loadClassInfo()
      } else {
        throw new Error(res.result.message || '保存失败')
      }
    } catch (err) {
      console.error('保存公告失败:', err)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
      this.hideNoticeModal()
    }
  },

  // 编辑课程表
  editSchedule() {
    wx.navigateTo({
      url: `/pages/schedule/edit/index?classId=${this.data.classId}`
    })
  },

  // 管理成员
  manageMembers() {
    wx.navigateTo({
      url: `/pages/class/members/index?classId=${this.data.classId}`
    })
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

  // 阻止冒泡
  stopPropagation() {
    // 什么都不做，只阻止事件冒泡
  },

  // 下拉刷新
  async onPullDownRefresh() {
    try {
      await Promise.all([
        this.loadClassInfo(),
        this.loadMembers()
      ])
    } finally {
      wx.stopPullDownRefresh()
    }
  }
}) 