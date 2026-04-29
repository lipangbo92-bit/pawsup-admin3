// pages/orders/orders.js
const app = getApp()

Page({
  data: {
    orders: [],
    status: 'all',
    tabs: [
      { key: 'all', name: '全部' },
      { key: 'pending', name: '待支付' },
      { key: 'paid', name: '已预约' },
      { key: 'completed', name: '已完成' },
      { key: 'canceled', name: '已取消' }
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
    
    const db = wx.cloud.database()
    const _ = db.command
    
    let query = { openid }
    if (this.data.status !== 'all') {
      query.status = this.data.status
    }
    
    const res = await db.collection('appointments').where(query).orderBy('createdAt', 'desc').get()
    
    // 补充详细信息
    const orders = await Promise.all(res.data.map(async order => {
      const [serviceRes, petRes, techRes] = await Promise.all([
        order.serviceId ? db.collection('services').doc(order.serviceId).get() : Promise.resolve({ data: {} }),
        order.petId ? db.collection('pets').doc(order.petId).get() : Promise.resolve({ data: {} }),
        order.technicianId ? db.collection('technicians').doc(order.technicianId).get() : Promise.resolve({ data: {} })
      ])
      
      return {
        ...order,
        serviceName: serviceRes.data.name || '已删除',
        petName: petRes.data.name || '已删除',
        technicianName: techRes.data.name || '已删除'
      }
    }))
    
    this.setData({ orders })
  },
  
  onChangeTab(e) {
    const { key } = e.currentTarget.dataset
    this.setData({ status: key })
    this.loadOrders()
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
              name: 'cancel-order',
              data: { orderId: id }
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
  }
})
