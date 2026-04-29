const app = getApp()

Page({
  data: {
    currentCategory: 0,
    categories: ['狗狗洗护', '狗狗造型', '狗狗寄养', '猫猫洗护', '猫猫造型', '猫猫寄养', '上门服务'],
    services: [],
    allServices: [],
    showPetSelector: false,
    selectedServiceId: ''
  },

  onLoad(options) {
    if (options && options.category !== undefined) {
      const categoryIndex = parseInt(options.category)
      if (!isNaN(categoryIndex) && categoryIndex >= 0 && categoryIndex < this.data.categories.length) {
        this.setData({ currentCategory: categoryIndex })
      }
    }
    this.loadServices()
  },

  onShow() {
    const app = getApp()
    if (app.globalData && app.globalData.selectedCategory !== undefined) {
      const categoryIndex = app.globalData.selectedCategory
      app.globalData.selectedCategory = undefined
      if (categoryIndex >= 0 && categoryIndex < this.data.categories.length) {
        this.filterServices(categoryIndex)
      }
    }
  },

  async loadServices() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'services-api',
        data: { action: 'list' }
      })
      
      if (res.result && res.result.success && res.result.data) {
        const services = res.result.data.map(item => ({
          _id: item._id,
          name: item.name,
          desc: item.desc || item.description || '',
          price: item.price,
          unit: item.unit || '起',
          category: item.category || '',
          image: item.image || '',
          iconText: this.getIconText(item.category),
          iconClass: this.getIconClass(item.category)
        }))
        
        this.setData({ allServices: services })
        this.filterServices(this.data.currentCategory)
      }
    } catch (err) {
      console.error('加载失败:', err)
    }
  },

  getIconText(category) {
    const map = {
      '狗狗洗护': '🛁', '狗狗造型': '✂️', '狗狗寄养': '🏠',
      '猫猫洗护': '🧼', '猫猫造型': '💇', '猫猫寄养': '🏨', '上门服务': '🚗'
    }
    return map[category] || '🐾'
  },

  getIconClass(category) {
    const map = {
      '狗狗洗护': 'icon-blue', '狗狗造型': 'icon-purple', '狗狗寄养': 'icon-orange',
      '猫猫洗护': 'icon-pink', '猫猫造型': 'icon-indigo', '猫猫寄养': 'icon-teal', '上门服务': 'icon-green'
    }
    return map[category] || 'icon-blue'
  },

  switchCategory(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    this.filterServices(index)
  },

  filterServices(index) {
    const category = this.data.categories[index]
    const filtered = this.data.allServices.filter(s => s.category === category)
    
    this.setData({ 
      currentCategory: index, 
      services: filtered
    })
  },

  // 路径3：服务页面点击预约
  bookService(e) {
    const serviceId = e.currentTarget.dataset.service
    this.setData({ 
      showPetSelector: true, 
      selectedServiceId: serviceId 
    })
  },

  // 宠物选择回调
  onPetSelected(e) {
    const { pet } = e.detail
    const { selectedServiceId } = this.data
    
    this.setData({ showPetSelector: false })
    
    // 路径3：去选时间
    wx.navigateTo({ 
      url: `/pages/booking-time-1/booking-time-1?mode=path3&petId=${pet._id}&serviceId=${selectedServiceId}` 
    })
  },

  onAddPet() {
    this.setData({ showPetSelector: false })
    wx.navigateTo({ url: '/pages/pet-register/pet-register' })
  },

  onPetSelectorClose() {
    this.setData({ showPetSelector: false })
  },

  onPullDownRefresh() {
    this.loadServices().finally(() => wx.stopPullDownRefresh())
  }
})
