Page({
  data: {
    mode: '',
    petId: '',
    serviceId: '',
    technicianId: '',
    selectedService: null,
    selectedTechnician: null,
    selectedDateIndex: 0,
    selectedDateStr: '',
    selectedTime: '',
    dateList: [],
    timeSections: []
  },

  onLoad(options) {
    const { mode, petId, serviceId, technicianId } = options
    this.setData({ mode, petId, serviceId, technicianId })
    
    this.generateDateList()
    
    if (serviceId) this.loadService(serviceId)
    if (technicianId) this.loadTechnician(technicianId)
  },

  async loadService(serviceId) {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'services-api',
        data: { action: 'get', id: serviceId }
      })
      if (result && result.success) {
        this.setData({ selectedService: result.data })
      }
    } catch (err) {
      console.error('加载服务失败:', err)
    }
  },

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

  generateDateList() {
    const dateList = []
    const today = new Date()
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      
      const month = date.getMonth() + 1
      const day = date.getDate()
      const weekDay = date.getDay()
      
      let weekText = weekDays[weekDay]
      if (i === 0) weekText = '今天'
      if (i === 1) weekText = '明天'
      
      dateList.push({
        date: `${month}-${day}`,
        day: `${month}/${day}`,
        week: weekText,
        fullDate: date.toISOString().split('T')[0],
        available: true
      })
    }
    
    this.setData({ 
      dateList,
      selectedDateStr: dateList[0].fullDate
    })
    
    this.loadTimeSlots(dateList[0].fullDate)
  },

  // 路径2：加载指定美容师的可用时段
  async loadTimeSlots(date) {
    const { technicianId } = this.data
    
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'availability-api',
        data: {
          action: 'getAvailableSlots',
          technicianId: technicianId,
          date: date
        }
      })
      
      if (result && result.success) {
        this.setData({ timeSections: result.data.timeSections })
      } else {
        this.setDefaultTimeSlots()
      }
    } catch (err) {
      console.error('加载时段失败:', err)
      this.setDefaultTimeSlots()
    }
  },

  setDefaultTimeSlots() {
    const timeSections = [
      {
        period: '上午',
        times: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'].map(t => ({
          time: t, selected: false, disabled: false, status: '可约'
        }))
      },
      {
        period: '下午',
        times: ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'].map(t => ({
          time: t, selected: false, disabled: false, status: '可约'
        }))
      },
      {
        period: '晚上',
        times: ['18:00', '18:30', '19:00', '19:30', '20:00'].map(t => ({
          time: t, selected: false, disabled: false, status: '可约'
        }))
      }
    ]
    this.setData({ timeSections })
  },

  onDateSelect(e) {
    const index = e.currentTarget.dataset.index
    const dateItem = this.data.dateList[index]
    
    this.setData({
      selectedDateIndex: index,
      selectedDateStr: dateItem.fullDate,
      selectedTime: ''
    })
    
    this.resetTimeSelection()
    this.loadTimeSlots(dateItem.fullDate)
  },

  onTimeSelect(e) {
    const { period, index } = e.currentTarget.dataset
    const timeSections = this.data.timeSections
    
    const section = timeSections.find(s => s.period === period)
    if (!section || section.times[index].disabled) return
    
    timeSections.forEach(s => {
      s.times.forEach(t => { t.selected = false })
    })
    
    section.times[index].selected = true
    
    this.setData({
      timeSections,
      selectedTime: section.times[index].time
    })
  },

  resetTimeSelection() {
    const timeSections = this.data.timeSections
    timeSections.forEach(s => {
      s.times.forEach(t => { t.selected = false })
    })
    this.setData({ timeSections, selectedTime: '' })
  },

  onConfirm() {
    if (!this.data.selectedTime) {
      wx.showToast({ title: '请选择预约时间', icon: 'none' })
      return
    }
    
    const { mode, petId, serviceId, technicianId, selectedDateStr, selectedTime } = this.data
    
    // 路径2：直接跳确认页
    wx.navigateTo({
      url: `/pages/booking-confirm/booking-confirm?mode=${mode}&petId=${petId}&serviceId=${serviceId}&technicianId=${technicianId}&date=${selectedDateStr}&time=${selectedTime}`
    })
  },

  goBack() {
    wx.navigateBack()
  }
})
