// pages/order-detail/order-detail.js
Page({
  data: {
    order: null,
    service: null,
    pet: null,
    technician: null
  },
  
  onLoad(options) {
    this.loadOrder(options.id)
  },
  
  async loadOrder(orderId) {
    const db = wx.cloud.database()
    
    const orderRes = await db.collection('appointments').doc(orderId).get()
    const order = orderRes.data
    
    // 状态文本映射
    const statusMap = {
      pending: '待支付',
      paid: '已预约',
      completed: '已完成',
      canceled: '已取消',
      refunded: '已退款'
    }
    order.statusText = statusMap[order.status] || order.status
    
    this.setData({ order })
    
    // 加载关联数据
    if (order.serviceId) {
      const serviceRes = await db.collection('services').doc(order.serviceId).get()
      this.setData({ service: serviceRes.data })
    }
    
    if (order.petId) {
      const petRes = await db.collection('pets').doc(order.petId).get()
      this.setData({ pet: petRes.data })
    }
    
    if (order.technicianId) {
      const techRes = await db.collection('technicians').doc(order.technicianId).get()
      this.setData({ technician: techRes.data })
    }
  },
  
  // 支付
  goToPay() {
    const { order } = this.data
    wx.navigateTo({
      url: `/pages/pay/pay?orderId=${order._id}&orderNo=${order.orderNo}&price=${order.price}`
    })
  },
  
  // 取消订单
  onCancel() {
    const { order } = this.data
    
    wx.showModal({
      title: '确认取消',
      content: '确定要取消该预约吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' })
          
          try {
            const result = await wx.cloud.callFunction({
              name: 'cancel-order',
              data: { orderId: order._id }
            })
            
            wx.hideLoading()
            
            if (result.result.success) {
              wx.showToast({ title: '已取消' })
              this.loadOrder(order._id)
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
  
  // 联系客服
  contactService() {
    wx.showModal({
      title: '联系客服',
      content: '请联系客服电话: 400-xxx-xxxx',
      showCancel: false
    })
  }
})
