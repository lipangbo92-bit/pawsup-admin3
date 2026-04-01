const app = getApp()

Page({
  data: {
    mode: '',
    petId: '',
    technicianId: '',
    selectedTechnician: null,
    selectedPet: null,
    categories: ['全部', '狗狗洗护', '狗狗造型', '狗狗寄养', '猫猫洗护', '猫猫造型', '猫猫寄养', '上门服务'],
    currentCategory: 0,
    services: [],
    allServices: []
  },

  onLoad(options) {
    const { mode, petId, technicianId, category, petType } = options
    this.setData({ mode, petId, technicianId, petType })

    console.log('[service-select] onLoad options:', options)
    console.log('[service-select] globalData:', app.globalData)
    console.log('[service-select] selectedPet:', app.globalData.selectedPet)

    // 从 globalData 获取宠物信息（用于 switchTab 跳转的场景）
    if (app.globalData.selectedPet) {
      const pet = app.globalData.selectedPet
      const petIdValue = pet.id || pet._id
      this.setData({
        selectedPet: pet,
        petId: petIdValue || petId
      })
      console.log('[service-select] 从 globalData 获取宠物:', pet)
      console.log('[service-select] 设置的 petId:', petIdValue)
    } else {
      console.warn('[service-select] globalData.selectedPet 为空')
    }
    
    // 如果有technicianId，加载美容师信息
    if (technicianId) {
      this.loadTechnician(technicianId)
    }
    
    // 加载服务，然后根据category自动切换分类
    this.loadServices().then(() => {
      // 如果有category参数，自动切换到对应分类
      if (category !== undefined) {
        const categoryIndex = parseInt(category)
        if (categoryIndex >= 0 && categoryIndex < this.data.categories.length) {
          this.setData({ currentCategory: categoryIndex })
          this.filterServices(categoryIndex)
        }
      }
    })
  },

  // 加载美容师信息
  async loadTechnician(technicianId) {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'technicians-api',
        data: { action: 'get', id: technicianId }
      })
      if (result && result.success) {
        this.setData({ selectedTechnician: result.data })
      }
    } catch (err) {
      console.error('加载美容师失败:', err)
    }
  },

  // 加载服务列表
  async loadServices() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'services-api',
        data: { action: 'list' }
      })
      
      if (result && result.success && result.data) {
        const services = result.data.map(item => ({
          _id: item._id,
          name: item.name,
          desc: item.desc || item.description || '',
          price: item.price,
          category: item.category || '',
          image: item.image || '',
          iconText: this.getIconText(item.category),
          iconClass: this.getIconClass(item.category)
        }))
        
        this.setData({ 
          allServices: services,
          services: services
        })
      }
    } catch (err) {
      console.error('加载服务失败:', err)
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

  // 切换分类
  switchCategory(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    this.setData({ currentCategory: index })
    this.filterServices(index)
  },

  filterServices(index) {
    if (index === 0) {
      this.setData({ services: this.data.allServices })
    } else {
      const category = this.data.categories[index]
      const filtered = this.data.allServices.filter(s => s.category === category)
      this.setData({ services: filtered })
    }
  },

  // 选择服务
  selectService(e) {
    const serviceId = e.currentTarget.dataset.id
    const service = this.data.services.find(s => s._id === serviceId)

    if (!service) return

    const { mode, petId, technicianId, selectedPet } = this.data

    // 构建宠物信息字符串
    const petIdStr = selectedPet ? (selectedPet.id || selectedPet._id) : petId
    const petTypeStr = selectedPet ? selectedPet.type : ''

    console.log('[service-select] selectService:', { mode, petIdStr, technicianId, selectedPet })

    if (mode === 'path1') {
      // 路径1：已选宠物 -> 选服务 -> 选时间 -> 选美容师
      wx.navigateTo({
        url: `/pages/booking-time-1/booking-time-1?mode=path1&petId=${petIdStr}&serviceId=${serviceId}`
      })
    } else if (mode === 'path2') {
      // 路径2：已选宠物 -> 选服务 -> 选时间（美容师已固定）
      const url = `/pages/booking-time-2/booking-time-2?mode=path2&petId=${petIdStr}&serviceId=${serviceId}&technicianId=${technicianId}`
      console.log('[service-select] 跳转到:', url)
      wx.navigateTo({ url })
    }
  },

  goBack() {
    wx.navigateBack()
  }
})
