// pages/index/index.js
const app = getApp()

Page({
  data: {
    services: [],
    technicians: [],
    banners: []
  },
  
  onLoad() {
    this.loadData()
  },
  
  onShow() {
    // 刷新登录状态
    if (!app.globalData.userInfo) {
      this.login()
    }
  },
  
  async login() {
    try {
      const res = await app.login()
      if (res.userInfo) {
        app.globalData.userInfo = res.userInfo
        wx.setStorageSync('userInfo', res.userInfo)
      }
    } catch (err) {
      console.error('登录失败', err)
    }
  },
  
  async loadData() {
    const db = wx.cloud.database()
    
    // 获取服务项目
    const servicesRes = await db.collection('services').where({
      isActive: true
    }).get()
    
    // 获取技师列表
    const techniciansRes = await db.collection('technicians').where({
      isActive: true
    }).get()
    
    this.setData({
      services: servicesRes.data,
      technicians: techniciansRes.data
    })
  },
  
  // 选择技师预约
  onSelectTechnician(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/technician/technician?id=${id}`
    })
  },
  
  // 选择服务项目预约
  onSelectService(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/booking-time/booking-time?serviceId=${id}`
    })
  },
  
  // 跳转到订单列表
  goToOrders() {
    wx.switchTab({
      url: '/pages/orders/orders'
    })
  }
})
