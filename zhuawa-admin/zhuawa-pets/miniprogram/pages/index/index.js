const app = getApp()

Page({
  data: {
    technicians: [],
    services: [],
    banners: [],
    showModal: false,
    selectedTechnician: null,
    showPetSelector: false,
    bookingMode: '',
    selectedServiceId: ''
  },

  onLoad() {
    console.log('index page onLoad')
    this.loadData()
    this.loadBanners()
  },

  async loadData() {
    try {
      const [techsRes, servicesRes] = await Promise.all([
        this.loadTechnicians(),
        this.loadServices()
      ])
      this.setData({ technicians: techsRes, services: servicesRes })
    } catch (err) {
      console.error('加载失败:', err)
      this.setData({ technicians: this.getLocalTechnicians(), services: [] })
    }
  },

  async loadBanners() {
    try {
      const res = await wx.cloud.callFunction({ name: 'banner-api', data: { action: 'list' } })
      if (res.result?.success) this.setData({ banners: res.result.data })
    } catch (err) { console.error('加载Banner失败:', err) }
  },

  async loadTechnicians() {
    try {
      const res = await wx.cloud.callFunction({ name: 'technicians-api', data: { action: 'list' } })
      if (res.result?.success) {
        return res.result.data.map(item => ({
          _id: item._id, name: item.name, level: item.level || '中级',
          position: item.position || '美容师', rating: item.rating || 5,
          orders: item.orders || 0, avatar: item.avatar || '',
          intro: item.introduction || '专业宠物美容师'
        }))
      }
      return this.getLocalTechnicians()
    } catch (err) { return this.getLocalTechnicians() }
  },

  async loadServices() {
    try {
      const res = await wx.cloud.callFunction({ name: 'services-api', data: { action: 'list' } })
      if (res.result?.success) {
        return res.result.data.slice(0, 4).map(item => ({
          _id: item._id, name: item.name, price: item.price,
          iconText: { '狗狗洗护': '🛁', '狗狗造型': '✂️', '狗狗寄养': '🏠', '猫猫洗护': '🧼', '猫猫造型': '💇', '猫猫寄养': '🏨', '上门服务': '🚗' }[item.category] || '🐾'
        }))
      }
      return []
    } catch (err) { return [] }
  },

  // 路径1：洗护美容入口
  goToService(e) {
    const serviceType = e.currentTarget.dataset.service
    if (serviceType === '洗护美容') {
      this.setData({ showPetSelector: true, bookingMode: 'path1' })
    } else if (serviceType === '寄养日托') {
      wx.navigateTo({ url: '/pages/boarding/boarding' })
    } else if (serviceType === '上门服务') {
      wx.navigateTo({ url: '/pages/visiting/visiting' })
    }
  },

  // 路径2：美容师卡片预约
  bookTechnician(e) {
    const technician = this.data.technicians[e.currentTarget.dataset.index]
    this.setData({ showPetSelector: true, bookingMode: 'path2', selectedTechnician: technician })
  },

  // 路径3：热门服务预约
  goToBooking(e) {
    this.setData({ showPetSelector: true, bookingMode: 'path3', selectedServiceId: e.currentTarget.dataset.id })
  },

  // 宠物选择弹窗回调
  onPetSelected(e) {
    const { pet } = e.detail
    const { bookingMode, selectedTechnician, selectedServiceId } = this.data
    this.setData({ showPetSelector: false })
    
    if (bookingMode === 'path1') {
      wx.navigateTo({ url: `/pages/service-select/service-select?mode=path1&petId=${pet._id}` })
    } else if (bookingMode === 'path2') {
      wx.navigateTo({ url: `/pages/service-select/service-select?mode=path2&petId=${pet._id}&technicianId=${selectedTechnician._id}` })
    } else if (bookingMode === 'path3') {
      wx.navigateTo({ url: `/pages/booking-time-1/booking-time-1?mode=path3&petId=${pet._id}&serviceId=${selectedServiceId}` })
    }
  },

  onAddPet() { this.setData({ showPetSelector: false }); wx.navigateTo({ url: '/pages/pet-register/pet-register' }) },
  onPetSelectorClose() { this.setData({ showPetSelector: false }) },

  showTechnicianDetail(e) {
    this.setData({ showModal: true, selectedTechnician: this.data.technicians[e.currentTarget.dataset.index] })
  },
  closeModal() { this.setData({ showModal: false, selectedTechnician: null }) },
  preventBubble() {},

  bookFromModal() {
    const technician = this.data.selectedTechnician
    this.closeModal()
    this.setData({ showPetSelector: true, bookingMode: 'path2', selectedTechnician: technician })
  },

  goToServices() { wx.switchTab({ url: '/pages/services/services' }) },

  getLocalTechnicians() {
    return [
      { _id: '1', name: '小美', level: '高级', position: '美容师', rating: 5, orders: 128, avatar: '', intro: '拥有5年宠物美容经验' },
      { _id: '2', name: '文子', level: '中级', position: '洗护师', rating: 4, orders: 86, avatar: '', intro: '专业洗护师' },
      { _id: '3', name: '王姐', level: '中级', position: '美容师', rating: 4, orders: 64, avatar: '', intro: '经验丰富' }
    ]
  },

  onPullDownRefresh() { Promise.all([this.loadData(), this.loadBanners()]).finally(() => wx.stopPullDownRefresh()) }
})
