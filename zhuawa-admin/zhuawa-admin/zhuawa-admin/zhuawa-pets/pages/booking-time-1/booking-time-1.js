// pages/booking-time-1/booking-time-1.js
Page({
  data: {
    currentStep: 2,
    selectedService: null,
    selectedDateIndex: 0,
    selectedDateStr: '',
    selectedTime: '',
    dateList: [],
    timeSections: [
      {
        period: '上午',
        times: [
          { time: '09:00', selected: false, disabled: false },
          { time: '09:30', selected: false, disabled: false },
          { time: '10:00', selected: false, disabled: false },
          { time: '10:30', selected: false, disabled: false },
          { time: '11:00', selected: false, disabled: true, status: '已约' },
          { time: '11:30', selected: false, disabled: false },
        ]
      },
      {
        period: '下午',
        times: [
          { time: '13:00', selected: false, disabled: false },
          { time: '13:30', selected: false, disabled: true, status: '已约' },
          { time: '14:00', selected: false, disabled: false },
          { time: '14:30', selected: false, disabled: false },
          { time: '15:00', selected: false, disabled: false },
          { time: '15:30', selected: false, disabled: false },
          { time: '16:00', selected: false, disabled: false },
          { time: '16:30', selected: false, disabled: true, status: '已满' },
        ]
      },
      {
        period: '晚上',
        times: [
          { time: '18:00', selected: false, disabled: false },
          { time: '18:30', selected: false, disabled: false },
          { time: '19:00', selected: false, disabled: false },
          { time: '19:30', selected: false, disabled: false },
          { time: '20:00', selected: false, disabled: false },
        ]
      }
    ],
    // 技师选择弹窗相关数据
    showTechnicianModal: false,
    selectedTechnician: null,
    technicians: [
      { id: 1, name: '小美', avatar: '👩', rating: 4.9, specialty: '洗澡' },
      { id: 2, name: '小李', avatar: '👨', rating: 4.8, specialty: '美容' },
      { id: 3, name: '小王', avatar: '🧑', rating: 4.7, specialty: '洗澡' },
      { id: 4, name: '小张', avatar: '👱', rating: 4.6, specialty: '美发' }
    ]
  },

  onLoad(options) {
    // 生成日期列表
    this.generateDateList();
    
    // 从上个页面接收选中的服务
    if (options.service) {
      try {
        const service = JSON.parse(decodeURIComponent(options.service));
        this.setData({ selectedService: service });
      } catch (e) {
        // 使用默认数据
        this.setData({
          selectedService: {
            id: 1,
            name: '宠物洗澡',
            price: 68,
            icon: '🛁'
          }
        });
      }
    } else {
      // 默认数据
      this.setData({
        selectedService: {
          id: 1,
          name: '宠物洗澡',
          price: 68,
          icon: '🛁'
        }
      });
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }
    });
  },

  // 生成日期列表
  generateDateList() {
    const dateList = [];
    const today = new Date();
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const weekDay = date.getDay();
      
      let weekText = weekDays[weekDay];
      if (i === 0) weekText = '今天';
      if (i === 1) weekText = '明天';
      
      dateList.push({
        date: `${month}-${day}`,
        day: `${month}/${day}`,
        week: weekText,
        fullDate: date.toISOString().split('T')[0],
        available: Math.random() > 0.2 // 80% 概率可预约
      });
    }
    
    this.setData({ 
      dateList,
      selectedDateStr: dateList[0].date
    });
  },

  // 选择日期
  onDateSelect(e) {
    const index = e.currentTarget.dataset.index;
    const dateItem = this.data.dateList[index];
    
    if (!dateItem.available) {
      wx.showToast({
        title: '该日期已约满',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      selectedDateIndex: index,
      selectedDateStr: dateItem.date,
      selectedTime: ''
    });
    
    // 重置时间选择
    this.resetTimeSelection();
  },

  // 选择时间
  onTimeSelect(e) {
    const { period, index } = e.currentTarget.dataset;
    const timeSections = this.data.timeSections;
    
    // 找到对应的时间段
    const section = timeSections.find(s => s.period === period);
    if (!section || section.times[index].disabled) return;
    
    // 重置所有选择
    timeSections.forEach(s => {
      s.times.forEach(t => {
        t.selected = false;
      });
    });
    
    // 设置当前选中
    section.times[index].selected = true;
    
    this.setData({
      timeSections,
      selectedTime: section.times[index].time
    });
  },

  // 重置时间选择
  resetTimeSelection() {
    const timeSections = this.data.timeSections;
    timeSections.forEach(s => {
      s.times.forEach(t => {
        t.selected = false;
      });
    });
    this.setData({ timeSections });
  },

  // 显示技师选择弹窗
  showTechnicianModal() {
    this.setData({
      showTechnicianModal: true
    });
  },

  // 关闭技师选择弹窗
  closeTechnicianModal() {
    this.setData({
      showTechnicianModal: false
    });
  },

  // 选择技师
  onTechnicianSelect(e) {
    const id = e.currentTarget.dataset.id;
    const technician = this.data.technicians.find(t => t.id === id);
    
    if (technician) {
      this.setData({
        selectedTechnician: technician
      });
    }
  },

  // 点击底部确认按钮 - 显示技师选择弹窗
  onConfirm() {
    if (!this.data.selectedTime) {
      wx.showToast({
        title: '请选择预约时间',
        icon: 'none'
      });
      return;
    }
    
    // 显示技师选择弹窗
    this.showTechnicianModal();
  },

  // 弹窗中的下一步按钮 - 跳转到确认页面
  onNextStep() {
    if (!this.data.selectedTechnician) {
      wx.showToast({
        title: '请选择技师',
        icon: 'none'
      });
      return;
    }
    
    const selectedDate = this.data.dateList[this.data.selectedDateIndex];
    const bookingInfo = {
      service: this.data.selectedService,
      date: selectedDate,
      time: this.data.selectedTime,
      technician: this.data.selectedTechnician
    };
    
    // 关闭弹窗
    this.closeTechnicianModal();
    
    // 跳转到确认页面
    wx.navigateTo({
      url: `/pages/booking-confirm/booking-confirm?info=${encodeURIComponent(JSON.stringify(bookingInfo))}`
    });
  }
});
