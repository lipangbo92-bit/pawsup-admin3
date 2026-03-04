// pages/booking-time/booking-time.js
Page({
  data: {
    serviceId: '',
    service: null,
    technicianId: '',
    technician: null,
    selectedDate: '',
    selectedTime: '',
    dates: [],
    timeSlots: [],
    weekDays: ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  },
  
  onLoad(options) {
    this.setData({
      serviceId: options.serviceId || '',
      technicianId: options.technicianId || ''
    })
    
    this.initDates()
    this.loadData()
  },
  
  initDates() {
    const dates = []
    const today = new Date()
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      dates.push({
        date: this.formatDate(date),
        day: date.getDate(),
        week: this.data.weekDays[date.getDay()],
        isToday: i === 0
      })
    }
    
    this.setData({
      dates,
      selectedDate: dates[0].date
    })
  },
  
  formatDate(date) {
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}-${day}`
  },
  
  async loadData() {
    const db = wx.cloud.database()
    
    // 获取服务信息
    if (this.data.serviceId) {
      const serviceRes = await db.collection('services').doc(this.data.serviceId).get()
      this.setData({ service: serviceRes.data })
    }
    
    // 获取技师信息
    if (this.data.technicianId) {
      const techRes = await db.collection('technicians').doc(this.data.technicianId).get()
      this.setData({ technician: techRes.data })
    }
    
    // 获取排班
    this.loadSchedule()
  },
  
  async loadSchedule() {
    const { technicianId, selectedDate } = this.data
    
    if (!technicianId || !selectedDate) {
      // 如果没有选择技师，显示默认时段
      this.generateDefaultSlots()
      return
    }
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'get-schedule',
        data: {
          technicianId,
          startDate: selectedDate,
          endDate: selectedDate
        }
      })
      
      if (res.result.success && res.result.schedules.length > 0) {
        const schedule = res.result.schedules[0]
        this.setData({ timeSlots: schedule.slots })
      } else {
        this.generateDefaultSlots()
      }
    } catch (err) {
      console.error('获取排班失败', err)
      this.generateDefaultSlots()
    }
  },
  
  generateDefaultSlots() {
    const slots = []
    const times = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
                   '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00']
    times.forEach(time => {
      slots.push({ time, available: true })
    })
    this.setData({ timeSlots: slots })
  },
  
  onSelectDate(e) {
    const { date } = e.currentTarget.dataset
    this.setData({ selectedDate: date, selectedTime: '' })
    this.loadSchedule()
  },
  
  onSelectTime(e) {
    const { time } = e.currentTarget.dataset
    if (!time.available) return
    
    this.setData({ selectedTime: time })
  },
  
  goToNext() {
    const { selectedDate, selectedTime } = this.data
    
    if (!selectedTime) {
      wx.showToast({ title: '请选择时间', icon: 'none' })
      return
    }
    
    // 跳转到选择宠物
    const url = `/pages/pet-select/pet-select?date=${this.data.selectedDate}&time=${selectedTime.time}&serviceId=${this.data.serviceId}&technicianId=${this.data.technicianId}`
    wx.navigateTo({ url })
  }
})
