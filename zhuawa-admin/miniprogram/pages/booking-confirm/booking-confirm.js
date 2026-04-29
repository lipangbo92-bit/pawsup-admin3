// pages/booking-confirm/booking-confirm.js
Page({
  data: {
    date: '',
    time: '',
    serviceId: '',
    technicianId: '',
    petId: '',
    service: null,
    technician: null,
    pet: null,
    remark: ''
  },
  
  onLoad(options) {
    this.setData({
      date: options.date || '',
      time: options.time || '',
      serviceId: options.serviceId || '',
      technicianId: options.technicianId || '',
      petId: options.petId || ''
    })
    
    this.loadData()
  },
  
  async loadData() {
    const db = wx.cloud.database()
    
    if (this.data.serviceId) {
      const serviceRes = await db.collection('services').doc(this.data.serviceId).get()
      this.setData({ service: serviceRes.data })
    }
    
    if (this.data.technicianId) {
      const techRes = await db.collection('technicians').doc(this.data.technicianId).get()
      this.setData({ technician: techRes.data })
    }
    
    if (this.data.petId) {
      const petRes = await db.collection('pets').doc(this.data.petId).get()
      this.setData({ pet: petRes.data })
    }
  },
  
  onRemarkChange(e) {
    this.setData({ remark: e.detail.value })
  },
  
  async submitOrder() {
    const { date, time, serviceId, technicianId, petId, remark } = this.data
    
    wx.showLoading({ title: '创建订单...' })
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'create-order',
        data: {
          petId,
          technicianId,
          serviceId,
          date,
          time,
          remark
        }
      })
      
      wx.hideLoading()
      
      if (res.result.success) {
        // 跳转到支付
        wx.navigateTo({
          url: `/pages/pay/pay?orderId=${res.result.orderId}&orderNo=${res.result.orderNo}&price=${res.result.price}`
        })
      } else {
        wx.showToast({ title: res.result.error, icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '创建订单失败', icon: 'none' })
      console.error(err)
    }
  }
})
