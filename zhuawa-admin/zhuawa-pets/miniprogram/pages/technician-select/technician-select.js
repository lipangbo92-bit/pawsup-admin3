Page({
  data: {
    mode: '',
    petId: '',
    serviceId: '',
    appointmentDate: '',
    appointmentTime: '',
    technicians: [],
    showModal: false,
    selectedTechnician: null
  },

  onLoad(options) {
    const { mode, petId, serviceId, date, time } = options
    console.log('[technician-select] onLoad options:', options)
    console.log('[technician-select] petId:', petId)
    this.setData({ 
      mode, 
      petId, 
      serviceId, 
      appointmentDate: date, 
      appointmentTime: time 
    })
    this.loadTechnicians()
  },

  // 加载美容师列表（过滤出该时段有空的）
  async loadTechnicians() {
    try {
      // 先加载所有美容师
      const { result } = await wx.cloud.callFunction({
        name: 'technicians-api',
        data: { action: 'list' }
      })
      
      if (result && result.success && result.data) {
        const technicians = result.data.map(item => ({
          _id: item._id,
          name: item.name,
          avatar: item.avatar || '',
          position: item.position || '美容师',
          level: item.level || '中级',
          rating: item.rating || 5,
          orders: item.orders || 0,
          intro: item.introduction || '',
          specialty: item.specialty || [],
          works: item.works || []
        }))
        
        // 查询可用性
        const { appointmentDate, appointmentTime } = this.data
        const { result: availResult } = await wx.cloud.callFunction({
          name: 'availability-api',
          data: {
            action: 'getAvailableTechnicians',
            technicians: technicians,
            date: appointmentDate,
            time: appointmentTime
          }
        })
        
        if (availResult && availResult.success) {
          // 标记可用性
          const availableIds = availResult.data.map(t => t._id || t.id)
          technicians.forEach(t => {
            t.isAvailable = availableIds.includes(t._id)
          })
        }
        
        this.setData({ technicians })
      }
    } catch (err) {
      console.error('加载美容师失败:', err)
      // 降级到本地数据
      this.setData({
        technicians: [
          { _id: '1', name: '小美', position: '美容师', level: '高级', rating: 4.9, orders: 128, isAvailable: true, specialty: ['洗澡', '造型'] },
          { _id: '2', name: '文子', position: '洗护师', level: '中级', rating: 4.8, orders: 86, isAvailable: false, specialty: ['洗澡'] }
        ]
      })
    }
  },

  // 显示美容师详情
  showDetail(e) {
    const { index } = e.currentTarget.dataset
    const technician = this.data.technicians[index]
    
    if (!technician.isAvailable) {
      wx.showToast({ title: '该美容师该时段已约满', icon: 'none' })
      return
    }
    
    this.setData({
      showModal: true,
      selectedTechnician: technician
    })
  },

  // 关闭弹窗
  closeModal() {
    this.setData({ showModal: false, selectedTechnician: null })
  },

  // 确认选择此美容师
  confirmSelect() {
    const technician = this.data.selectedTechnician
    this.closeModal()
    this.goToConfirm(technician)
  },

  // 系统分配
  selectAuto() {
    const availableTechs = this.data.technicians.filter(t => t.isAvailable)
    if (availableTechs.length === 0) {
      wx.showToast({ title: '暂无可分配的美容师', icon: 'none' })
      return
    }
    
    // 选择评分最高的
    const bestTech = availableTechs.reduce((best, current) => 
      (current.rating > best.rating) ? current : best
    )
    
    this.goToConfirm(bestTech)
  },

  // 跳转到确认页
  goToConfirm(technician) {
    const { mode, petId, serviceId, appointmentDate, appointmentTime } = this.data
    console.log('[technician-select] goToConfirm petId:', petId)
    
    // 构建 bookingInfo 对象
    const bookingInfo = {
      service: { _id: serviceId },
      pet: { _id: petId },
      technician: { _id: technician._id, name: technician.name },
      date: { fullDate: appointmentDate },
      time: appointmentTime
    }
    
    wx.navigateTo({
      url: `/pages/booking-confirm/booking-confirm?info=${encodeURIComponent(JSON.stringify(bookingInfo))}`
    })
  },

  goBack() {
    wx.navigateBack()
  }
})
