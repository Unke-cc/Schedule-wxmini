const { callCloudFunction, showSuccess } = require('../../../utils/request')

Page({
  data: {
    isInitializing: false,
    initResult: null
  },

  async initializeStorage() {
    if (this.data.isInitializing) return

    this.setData({ isInitializing: true })
    try {
      const result = await callCloudFunction({
        name: 'initStorage',
        loadingText: '初始化中'
      })

      this.setData({ 
        initResult: result.results,
        isInitializing: false
      })

      showSuccess('初始化完成')
    } catch (error) {
      console.error('初始化失败:', error)
      this.setData({ isInitializing: false })
    }
  }
}) 