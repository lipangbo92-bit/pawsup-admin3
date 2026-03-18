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
          avatar: item.avatarUrl || item.avatar || '',
          position: item.position || '美容师',
          level: item.level || '中级',
          rating: item.rating || 5,
          orders: item.orders || 0,
          intro: item.intro || item.introduction || '',
          skills: item.skills || [],
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
          { _id: '1', name: '小美', position: '美容师', level: '高级', rating: 4.9, orders: 128, isAvailable: true, skills: ['洗澡', '造型'] },
          { _id: '2', name: '文子', position: '洗护师', level: '中级', rating: 4.8, orders: 86, isAvailable: false, skills: ['洗澡'] }
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
    
    wx.navigateTo({
      url: `/pages/booking-confirm/booking-confirm?mode=${mode}&petId=${petId}&serviceId=${serviceId}&technicianId=${technician._id}&date=${appointmentDate}&time=${appointmentTime}`
    })
  },

  goBack() {
    wx.navigateBack()
  }
})
