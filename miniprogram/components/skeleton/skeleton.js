Component({
  properties: {
    loading: {
      type: Boolean,
      value: true
    },
    type: {
      type: String,
      value: 'rect' // rect, circle, text
    },
    width: {
      type: String,
      value: '100%'
    },
    height: {
      type: String,
      value: '32rpx'
    },
    backgroundColor: {
      type: String,
      value: '#f0f0f0'
    },
    animated: {
      type: Boolean,
      value: true
    }
  },
  
  data: {
    animationClass: ''
  },
  
  attached() {
    if (this.properties.animated) {
      this.setData({
        animationClass: 'skeleton-animation'
      })
    }
  }
}) 