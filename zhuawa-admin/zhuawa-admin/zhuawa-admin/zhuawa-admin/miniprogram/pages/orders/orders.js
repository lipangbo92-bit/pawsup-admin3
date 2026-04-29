// pages/orders/orders.js
const app = getApp()

Page({
  data: {
    orders: [],
    status: 'all',
    tabs: [
      { key: 'all', name: '全部' },
      { key: 'unpaid', name: '待支付' },
      { key: 'pending', name: '待服务' },
      { key: 'completed', name: '已完成' }
    ]
  },

  onLoad() {
    this.setData({ status: 'all' })
  },

  onShow() {
    this.loadOrders()
  },

  async loadOrders() {
    const openid = app.globalData.openid

    if (!openid) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    wx.showLoading({ title: '加载中...' })

    try {
      // 构建查询参数
      const activeTab = this.data.status
      let queryParams = {
        action: 'getOrders',
        userId: openid
      }

      // 根据标签筛选：unpaid按paymentStatus，pending/completed按status
      if (activeTab === 'unpaid') {
        queryParams.paymentStatus = 'unpaid'
      } else if (activeTab === 'pending') {
        queryParams.status = 'pending'
      } else if (activeTab === 'completed') {
        queryParams.status = 'completed'
      }
      // all 不传任何筛选条件

      const res = await wx.cloud.callFunction({
        name: 'orders-api',
        data: queryParams
      })

      wx.hideLoading()

      if (res.result && res.result.success) {
        // 处理订单数据，添加显示文本
        const orders = res.result.data.map(order => ({
          ...order,
          statusText: this.getStatusText(order.status, order.paymentStatus),
          priceLabel: order.paymentStatus === 'unpaid' ? '订单金额' : '实付金额',
          price: order.finalPrice || order.totalPrice || 0
        }))
        this.setData({ orders })
      } else {
        wx.showToast({ title: res.result.error || '加载失败', icon: 'none' })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('加载订单失败:', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // 获取状态显示文本
  getStatusText(status, paymentStatus) {
    if (paymentStatus === 'unpaid') {
      return '待支付'
    }
    const statusMap = {
      pending: '待服务',
      in_service: '服务中',
      completed: '已完成',
      cancelled: '已取消'
    }
    return statusMap[status] || status
  },
  
  onChangeTab(e) {
    const { key } = e.currentTarget.dataset
    this.setData({ status: key }, () => {
      this.loadOrders()
    })
  },
  
  goToDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${id}`
    })
  },
  
  // 取消订单
  async onCancelOrder(e) {
    const { id } = e.currentTarget.dataset

    wx.showModal({
      title: '确认取消',
      content: '确定要取消该预约吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' })

          try {
            const result = await wx.cloud.callFunction({
              name: 'orders-api',
              data: {
                action: 'cancelOrder',
                orderId: id
              }
            })

            wx.hideLoading()

            if (result.result.success) {
              wx.showToast({ title: '已取消' })
              this.loadOrders()
            } else {
              wx.showToast({ title: result.result.error, icon: 'none' })
            }
          } catch (err) {
            wx.hideLoading()
            wx.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      }
    })
  },

  // 支付订单
  async onPayOrder(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${id}&action=pay`
    })
  },

  stopPropagation() {
    // 阻止冒泡
  }
})
