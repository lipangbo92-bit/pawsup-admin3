// pages/pet-select/pet-select.js
Page({
  data: {
    pets: [],
    selectedPet: null,
    date: '',
    time: '',
    serviceId: '',
    technicianId: '',
    service: null,
    technician: null
  },
  
  onLoad(options) {
    this.setData({
      date: options.date || '',
      time: options.time || '',
      serviceId: options.serviceId || '',
      technicianId: options.technicianId || ''
    })
    
    this.loadPets()
    this.loadServiceInfo()
  },
  
  async loadPets() {
    const app = getApp()
    const openid = app.globalData.openid
    
    if (!openid) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    
    const db = wx.cloud.database()
    
    // 获取用户ID
    const userRes = await db.collection('users').where({
      openid: openid
    }).get()
    
    if (userRes.data.length === 0) {
      this.setData({ pets: [] })
      return
    }
    
    const userId = userRes.data[0]._id
    
    // 获取用户的宠物
    const petsRes = await db.collection('pets').where({
      userId: userId
    }).get()
    
    this.setData({ pets: petsRes.data })
  },
  
  async loadServiceInfo() {
    const db = wx.cloud.database()
    
    if (this.data.serviceId) {
      const serviceRes = await db.collection('services').doc(this.data.serviceId).get()
      this.setData({ service: serviceRes.data })
    }
    
    if (this.data.technicianId) {
      const techRes = await db.collection('technicians').doc(this.data.technicianId).get()
      this.setData({ technician: techRes.data })
    }
  },
  
  onSelectPet(e) {
    const { id } = e.currentTarget.dataset
    const pet = this.data.pets.find(p => p._id === id)
    this.setData({ selectedPet: pet })
  },
  
  goToAddPet() {
    wx.navigateTo({
      url: '/pages/pet-add/pet-add'
    })
  },
  
  goToConfirm() {
    if (!this.data.selectedPet) {
      wx.showToast({ title: '请选择宠物', icon: 'none' })
      return
    }
    
    const { date, time, serviceId, technicianId, selectedPet, service, technician } = this.data
    
    wx.navigateTo({
      url: `/pages/booking-confirm/booking-confirm?date=${date}&time=${time}&serviceId=${serviceId}&technicianId=${technicianId}&petId=${selectedPet._id}`
    })
  }
})
