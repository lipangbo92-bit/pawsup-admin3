// pages/booking-time-1/booking-time-1.js
// 服务驱动路径：选服务 → 选时间 → 选美容师
Page({
  data: {
    currentStep: 2,
    selectedService: null,
    selectedPet: null,
    selectedDateIndex: 0,
    selectedDateStr: '',
    selectedTime: '',
    dateList: [],
    timeSections: [],
    technicians: [],
    
    // 技师选择弹窗
    showTechnicianModal: false,
    selectedTechnician: null,
    loadingTechnicians: false,
    loadingTimeSlots: false
  },

  onLoad(options) {
    console.log('booking-time-1 onLoad options:', options);
    
    // 路径3：从URL参数加载服务信息
    if (options.mode === 'path3' && options.serviceId) {
      this.loadServiceById(options.serviceId);
    } else if (options.service) {
      // 解析服务信息（JSON字符串格式）
      try {
        const service = JSON.parse(decodeURIComponent(options.service));
        this.setData({ selectedService: service });
      } catch (e) {
        this.setDefaultService();
      }
    } else {
      this.setDefaultService();
    }
    
    // 解析宠物信息
    if (options.petInfo) {
      try {
        const petInfo = JSON.parse(decodeURIComponent(options.petInfo));
        this.setData({ selectedPet: petInfo });
        console.log('booking-time-1 received pet:', petInfo);
      } catch (e) {
        console.error('解析宠物信息失败:', e);
      }
    } else if (options.petId) {
      // 兼容旧版参数
      this.setData({ 
        selectedPet: {
          _id: options.petId,
          type: options.petType || 'dog'
        }
      });
    }
    
    this.generateDateList();
    this.loadTechnicians();
    
    // 加载默认日期的时段（不指定美容师，显示所有时段）
    const today = new Date();
    this.loadTimeSlots(today.toISOString().split('T')[0]);
  },

  // 根据ID加载服务信息（路径3）
  async loadServiceById(serviceId) {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'services-api',
        data: { action: 'list' }
      });
      
      if (result && result.success && result.data) {
        const service = result.data.find(s => s._id === serviceId || s.id === serviceId);
        if (service) {
          this.setData({
            selectedService: {
              id: service._id || service.id,
              name: service.name,
              price: service.price,
              icon: '🛁',
              duration: service.duration || 60
            }
          });
        } else {
          this.setDefaultService();
        }
      }
    } catch (err) {
      console.error('加载服务失败:', err);
      this.setDefaultService();
    }
  },

  setDefaultService() {
    this.setData({
      selectedService: {
        id: 1,
        name: '宠物洗澡',
        price: 68,
        icon: '🛁',
        duration: 60
      }
    });
  },

  loadTechnicians() {
    wx.cloud.callFunction({
      name: 'technicians-api',
      data: { action: 'list' }
    }).then(res => {
      if (res.result.success) {
        this.setData({
          technicians: res.result.data.map(t => {
            // 处理头像字段
            let avatar = t.avatar || '';
            // 如果avatar是URL但格式不正确，使用空字符串（显示默认头像）
            if (avatar && (avatar.includes('cdn.cn/vant') || avatar.length < 10)) {
              avatar = '';
            }
            return {
              id: t._id,
              name: t.name,
              avatar: avatar,
              position: t.position || '美容师',
              level: t.level || '中级',
              rating: t.rating || 5,
              orders: t.orders || 0,
              specialty: t.specialty ? t.specialty[0] : '洗护'
            };
          })
        });
      }
    }).catch(err => {
      console.error('加载美容师失败:', err);
    });
  },

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
        available: true
      });
    }
    
    this.setData({ 
      dateList,
      selectedDateStr: dateList[0].date
    });
  },

  // 加载时段 - 路径1不指定美容师，显示所有时段
  loadTimeSlots(date) {
    this.setData({ loadingTimeSlots: true });
    
    // 先显示基础时段
    const baseSlots = this.generateBaseTimeSlots();
    this.setData({ timeSections: baseSlots });
    
    // 查询该日期所有美容师的预约情况，统计每个时段的可约数量
    wx.cloud.callFunction({
      name: 'availability-api',
      data: {
        action: 'getAllSlotsAvailability',
        date: date
      }
    }).then(res => {
      this.setData({ loadingTimeSlots: false });
      
      if (res.result && res.result.success && res.result.data.timeSections) {
        // 使用返回的时段数据（包含可约数量）
        this.setData({ timeSections: res.result.data.timeSections });
      }
    }).catch(err => {
      console.error('加载时段失败:', err);
      this.setData({ loadingTimeSlots: false });
      // 保持基础时段显示
    });
  },

  generateBaseTimeSlots() {
    const slots = [];
    // 正确定义时段：上午9-12，下午12-18，晚上18-21
    const periods = [
      { name: '上午', start: 9, end: 12 },   // 9:00 - 12:00
      { name: '下午', start: 12, end: 18 }, // 12:00 - 18:00
      { name: '晚上', start: 18, end: 21 }  // 18:00 - 21:00
    ];

    const selectedDate = this.data.dateList[this.data.selectedDateIndex];
    const isToday = selectedDate && selectedDate.fullDate === new Date().toISOString().split('T')[0];

    // 获取服务时长（分钟）
    const serviceDuration = this.data.selectedService?.duration || 60;
    // 计算最晚可预约时间（21:00 - 服务时长）
    const latestHour = 21;
    const latestStartHour = latestHour - Math.ceil(serviceDuration / 60);
    const latestStartMinute = (60 - (serviceDuration % 60)) % 60;

    periods.forEach((period, periodIndex) => {
      const times = [];
      // 生成时段
      for (let h = period.start; h <= period.end; h++) {
        // 每个小时生成 :00 和 :30 两个时段
        const minutesList = [0, 30];
        minutesList.forEach(minute => {
          // 跳过时段分界点的重复时间点
          // 上午的12:30不应该生成（因为下午从12:00开始会生成12:30）
          if (periodIndex === 0 && h === 12 && minute === 30) return;
          // 下午的18:30不应该生成（因为晚上从18:00开始会生成18:30）
          if (periodIndex === 1 && h === 18 && minute === 30) return;
          // 跳过时段起始整点（除了第一个时段）- 避免12:00、18:00重复
          if (minute === 0 && h === period.start && periodIndex > 0) return;
          // 21:00 不生成（营业时间结束）
          if (h === 21) return;

          const timeStr = `${h.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

          // 判断是否为今天且时间已过期
          const isExpired = isToday && !this.isValidBookingTime(selectedDate.fullDate, timeStr);

          // 判断是否在可预约范围内（考虑服务时长）
          let isTooLate = false;
          if (h > latestStartHour || (h === latestStartHour && minute > latestStartMinute)) {
            isTooLate = true;
          }

          times.push({
            time: timeStr,
            selected: false,
            disabled: isExpired || isTooLate,
            status: isExpired ? '已过期' : (isTooLate ? '不可约' : '可约'),
            availableCount: (isExpired || isTooLate) ? 0 : 3
          });
        });
      }
      slots.push({ period: period.name, times });
    });

    return slots;
  },

  onDateSelect(e) {
    const index = e.currentTarget.dataset.index;
    const dateItem = this.data.dateList[index];
    
    this.setData({
      selectedDateIndex: index,
      selectedDateStr: dateItem.date,
      selectedTime: ''
    });
    
    this.resetTimeSelection();
    this.loadTimeSlots(dateItem.fullDate);
  },

  onTimeSelect(e) {
    const { period, index } = e.currentTarget.dataset;
    const timeSections = this.data.timeSections;

    const section = timeSections.find(s => s.period === period);
    if (!section) return;

    const selectedSlot = section.times[index];

    // 如果时段不可用，显示提示
    if (selectedSlot.disabled) {
      if (selectedSlot.status === '不可约') {
        const serviceDuration = this.data.selectedService?.duration || 60;
        wx.showToast({ title: `该时段无法完成${serviceDuration}分钟服务`, icon: 'none' });
      } else if (selectedSlot.status === '已过期') {
        wx.showToast({ title: '该时段已过期', icon: 'none' });
      }
      return;
    }

    const selectedTime = selectedSlot.time;
    const selectedDate = this.data.dateList[this.data.selectedDateIndex];

    // 校验预约时间不能早于当前时间
    if (!this.isValidBookingTime(selectedDate.fullDate, selectedTime)) {
      wx.showToast({ title: '预约时间不能早于当前时间', icon: 'none' });
      return;
    }

    timeSections.forEach(s => {
      s.times.forEach(t => { t.selected = false; });
    });

    section.times[index].selected = true;

    this.setData({
      timeSections,
      selectedTime: selectedTime
    });
  },

  // 校验预约时间是否有效（不能早于当前时间）
  isValidBookingTime(dateStr, timeStr) {
    const now = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    // 构建预约时间的 Date 对象
    const bookingDate = new Date(dateStr);
    bookingDate.setHours(hours, minutes, 0, 0);
    
    // 预约时间必须晚于当前时间（至少提前30分钟）
    const minBookingTime = new Date(now.getTime() + 30 * 60 * 1000);
    
    return bookingDate >= minBookingTime;
  },

  resetTimeSelection() {
    // 重新加载时段，保持可用性标记
    const dateItem = this.data.dateList[this.data.selectedDateIndex];
    this.loadTimeSlots(dateItem.fullDate);
  },

  goBack() {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.switchTab({ url: '/pages/index/index' });
      }
    });
  },

  showTechnicianModal() {
    if (!this.data.selectedTime) {
      wx.showToast({ title: '请先选择时间', icon: 'none' });
      return;
    }
    
    const selectedDate = this.data.dateList[this.data.selectedDateIndex];
    this.setData({ loadingTechnicians: true });
    
    // 查询该时段可预约的美容师
    wx.cloud.callFunction({
      name: 'availability-api',
      data: {
        action: 'getAvailableTechnicians',
        date: selectedDate.fullDate,
        time: this.data.selectedTime,
        technicians: this.data.technicians,
        duration: this.data.selectedService?.duration || 60
      }
    }).then(res => {
      this.setData({ loadingTechnicians: false });

      if (res.result && res.result.success) {
        const availableTechs = res.result.data;
        if (availableTechs.length === 0) {
          wx.showToast({ title: '该时段暂无可用美容师', icon: 'none' });
        }
        // 只显示可约的美容师，如果没有则不显示任何美容师
        this.setData({
          technicians: availableTechs,
          showTechnicianModal: true
        });
      } else {
        // API调用失败，显示所有美容师（降级处理）
        this.setData({ showTechnicianModal: true });
      }
    }).catch(err => {
      console.error('获取可用美容师失败:', err);
      this.setData({ loadingTechnicians: false, showTechnicianModal: true });
    });
  },

  closeTechnicianModal() {
    this.setData({ showTechnicianModal: false });
  },

  onTechnicianSelect(e) {
    const id = e.currentTarget.dataset.id;
    const technician = this.data.technicians.find(t => t.id === id);
    
    if (technician) {
      this.setData({ selectedTechnician: technician });
    }
  },

  onConfirm() {
    if (!this.data.selectedTime) {
      wx.showToast({ title: '请选择预约时间', icon: 'none' });
      return;
    }
    
    this.showTechnicianModal();
  },

  onNextStep() {
    if (!this.data.selectedTechnician) {
      wx.showToast({ title: '请选择技师', icon: 'none' });
      return;
    }
    
    const selectedDate = this.data.dateList[this.data.selectedDateIndex];
    const bookingInfo = {
      service: this.data.selectedService,
      pet: this.data.selectedPet,
      date: selectedDate,
      time: this.data.selectedTime,
      technician: this.data.selectedTechnician
    };
    
    this.closeTechnicianModal();
    
    wx.navigateTo({
      url: `/pages/booking-confirm/booking-confirm?info=${encodeURIComponent(JSON.stringify(bookingInfo))}`
    });
  }
});
