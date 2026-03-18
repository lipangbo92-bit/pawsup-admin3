// 预约成功页
Page({
  data: {
    orderId: '',
    orderNo: '',
    orderInfo: null,
    loading: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ orderId: options.id })
      this.loadOrderDetail(options.id)
    } else if (options.orderNo) {
      this.setData({ orderNo: options.orderNo })
    } else {
      // 生成临时订单号
      this.generateOrderNo()
    }
  },

  async loadOrderDetail(orderId) {
    this.setData({ loading: true })
    
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'orders-api',
        data: {
          httpMethod: 'GET',
          path: `/orders/${orderId}`
        }
      })
      
      if (result && result.success) {
        const order = result.data
        this.setData({
          orderInfo: order,
          orderNo: order.orderNo || this.data.orderNo
        })
      }
    } catch (err) {
      console.error('加载订单详情失败:', err)
    } finally {
      this.setData({ loading: false })
    }
  },

  generateOrderNo() {
    const no = 'BK' + Date.now().toString().slice(-8)
    this.setData({ orderNo: no })
  },

  goToOrders() {
    wx.switchTab({ url: '/pages/orders/orders' })
  },

  goToHome() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
