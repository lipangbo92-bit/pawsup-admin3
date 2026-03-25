// 预约确认页
Page({
  data: {
    mode: '',
    service: null,
    pet: null,
    technician: null,
    date: '',
    time: '',
    remark: '',
    submitting: false,
    totalPrice: 0
  },

  onLoad(options) {
    const { mode, petId, serviceId, technicianId, date, time } = options
    this.setData({ mode, date, time })
    
    // 并行加载数据
    this.loadData(serviceId, petId, technicianId)
  },

  async loadData(serviceId, petId, technicianId) {
    wx.showLoading({ title: '加载中...' })
    
    try {
      const tasks = []
      
      if (serviceId) {
        tasks.push(this.loadService(serviceId))
      }
      if (petId) {
        tasks.push(this.loadPet(petId))
      }
      if (technicianId) {
        tasks.push(this.loadTechnician(technicianId))
      }
      
      await Promise.all(tasks)
      
      // 计算总价
      this.calculatePrice()
    } catch (err) {
      console.error('加载数据失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  async loadService(serviceId) {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'services-api',
        data: { action: 'get', id: serviceId }
      })
      if (result && result.success) {
        this.setData({ service: result.data })
      }
    } catch (err) {
      console.error('加载服务失败:', err)
    }
  },

  async loadPet(petId) {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'pets-api',
        data: {
          httpMethod: 'GET',
          path: `/pets/${petId}`
        }
      })
      if (result && result.success) {
        this.setData({ pet: result.data })
        console.log('[BookingConfirm] Loaded pet:', result.data)
      }
    } catch (err) {
      console.error('加载宠物失败:', err)
    }
  },

  async loadTechnician(technicianId) {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'technicians-api',
        data: { action: 'get', id: technicianId }
      })
      if (result && result.success) {
        this.setData({ technician: result.data })
      }
    } catch (err) {
      console.error('加载美容师失败:', err)
    }
  },

  calculatePrice() {
    const { service, pet } = this.data
    let price = service?.price || 0
    
    // 根据宠物体重加价
    if (pet?.type === 'dog') {
      const weight = parseFloat(pet.weight) || 0
      if (weight > 20) price += 50
      else if (weight > 10) price += 20
    }
    
    this.setData({ totalPrice: price })
  },

  onRemarkChange(e) {
    this.setData({ remark: e.detail.value })
  },

  async submitOrder() {
    const { service, pet, technician, date, time, remark, totalPrice } = this.data
    
    if (!service || !date || !time) {
      wx.showToast({ title: '信息不完整', icon: 'none' })
      return
    }

    if (this.data.submitting) return
    this.setData({ submitting: true })
    wx.showLoading({ title: '提交中...' })

    try {
      // 获取用户信息
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.openid) {
        throw new Error('请先登录')
      }

      // 构建订单数据
      const orderData = {
        userId: userInfo.openid,
        orderType: 'service',
        serviceId: service._id,
        serviceName: service.name,
        servicePrice: service.price,
        petId: pet?._id || '',
        petName: pet?.name || '',
        petType: pet?.type || '',
        petBreed: pet?.breed || '',
        technicianId: technician?._id || '',
        technicianName: technician?.name || '待分配',
        appointmentDate: date,
        appointmentTime: time,
        totalPrice: totalPrice,
        finalPrice: totalPrice,
        remark: remark
      }

      // 调用 orders-api 创建订单
      const { result } = await wx.cloud.callFunction({
        name: 'orders-api',
        data: {
          action: 'createOrder',
          data: orderData
        }
      })

      wx.hideLoading()

      if (result && result.success) {
        wx.redirectTo({
          url: `/pages/booking-success/booking-success?id=${result.data._id}&orderNo=${result.data.orderNo}`
        })
      } else {
        throw new Error(result?.error || '创建订单失败')
      }
    } catch (err) {
      wx.hideLoading()
      this.setData({ submitting: false })
      wx.showModal({
        title: '提交失败',
        content: err.message || '请稍后再试',
        showCancel: false
      })
      console.error(err)
    }
  }
})
