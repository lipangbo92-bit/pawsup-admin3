// pages/orders/orders.js
// 订单列表页面 - 使用统一 orders-api

Page({
  data: {
    // 当前选中的标签
    activeTab: 'all',
    // 标签列表 - 按支付状态和服务状态筛选
    tabs: [
      { key: 'all', label: '全部' },
      { key: 'unpaid', label: '待支付' },
      { key: 'pending', label: '待服务' },
      { key: 'completed', label: '已完成' }
    ],
    // 订单列表
    orders: [],
    // 是否加载中
    loading: false
  },

  onLoad() {
    this.loadOrders()
  },

  onShow() {
    // 每次显示页面时刷新订单
    this.loadOrders()
  },

  // 加载订单列表
  async loadOrders() {
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo || !userInfo.openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    this.setData({ loading: true })

    // 构建查询参数
    const activeTab = this.data.activeTab
    let queryParams = {
      action: 'getOrders',
      userId: userInfo.openid
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

    try {
      const res = await wx.cloud.callFunction({
        name: 'orders-api',
        data: queryParams
      })

      if (res.result && res.result.success) {
        // 处理订单数据，添加显示文本
        const orders = res.result.data.map(order => ({
          ...order,
          statusText: this.getStatusText(order.status, order.paymentStatus),
          priceLabel: order.paymentStatus === 'unpaid' ? '订单金额' : '实付金额',
          displayPrice: order.finalPrice || order.totalPrice || 0
        }))
        this.setData({
          orders: orders,
          loading: false
        })
      } else {
        this.setData({ loading: false })
        wx.showToast({
          title: res.result.error || '加载失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('加载订单失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
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

  // 切换标签
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab }, () => {
      this.loadOrders()
    })
  },

  // 点击订单卡片
  onOrderClick(e) {
    const orderId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?orderId=${orderId}`
    })
  },

  // 取消订单
  async onCancelOrder(e) {
    const orderId = e.currentTarget.dataset.id

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
                orderId: orderId
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
    const orderId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?orderId=${orderId}&action=pay`
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadOrders().finally(() => {
      wx.stopPullDownRefresh()
    })
  }
})
