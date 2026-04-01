// pages/booking-time-2/booking-time-2.js
// 美容师驱动路径：已选美容师 → 选时间
Page({
  data: {
    currentStep: 3,
    selectedTechnician: null,
    selectedService: null,
    selectedDateIndex: 0,
    selectedDateStr: '',
    selectedTime: '',
    totalPrice: 0,
    dateList: [],
    timeSections: [],
    loadingTimeSlots: false
  },

  onLoad(options) {
    console.log('booking-time-2 onLoad options:', options);
    this.generateDateList();
    
    // 优先处理 info 参数（JSON格式，用于从其他页面传入完整数据）
    if (options.info) {
      try {
        const info = JSON.parse(decodeURIComponent(options.info));
        console.log('[booking-time-2] 解析 info 参数:', info);
        console.log('[booking-time-2] info.pet:', info.pet);

        this.setData({
          selectedTechnician: info.technician,
          selectedService: info.service,
          selectedPet: info.pet,
          selectedPetId: info.pet?._id || info.pet?.id,
          totalPrice: info.service ? info.service.price : 0
        });

        // 加载该美容师的时段
        const selectedDate = this.data.dateList[0];
        if (selectedDate && info.technician) {
          this.loadTechnicianTimeSlots(info.technician.id, selectedDate.fullDate, info.service?.duration || 60);
        }
        return;
      } catch (e) {
        console.error('解析 info 参数失败:', e);
      }
    }
    
    // 处理 URL 参数（用于路径2：从 services 页面跳转）
    console.log('checking path2:', options.mode, options.technicianId);
    if (options.mode === 'path2' && options.technicianId) {
      console.log('进入 path2 数据加载');
      this.loadDataFromParams(options);
    } else {
      console.log('使用默认数据');
      this.setDefaultData();
    }
  },

  // 从 URL 参数加载数据（路径2）
  async loadDataFromParams(options) {
    const { technicianId, serviceId, petId } = options;
    console.log('loadDataFromParams:', { technicianId, serviceId, petId });
    console.log('petId type:', typeof petId, 'value:', petId);
    
    wx.showLoading({ title: '加载中...' });
    
    try {
      // 并行加载美容师、服务和宠物信息
      const [techRes, serviceRes, petRes] = await Promise.all([
        this.loadTechnician(technicianId),
        this.loadService(serviceId),
        this.loadPet(petId)
      ]);
      
      console.log('加载结果:', { techRes, serviceRes, petRes });
      console.log('petRes detail:', petRes);

      if (!techRes || !serviceRes) {
        console.error('加载数据失败: techRes 或 serviceRes 为空');
        this.setDefaultData();
        return;
      }
      
      this.setData({
        selectedTechnician: techRes,
        selectedService: serviceRes,
        selectedPet: petRes,
        selectedPetId: petId,
        totalPrice: serviceRes.price || 0
      }, () => {
        console.log('setData 完成:', this.data.selectedTechnician, this.data.selectedService, this.data.selectedPet);
      });
      
      // 加载该美容师的时段
      const selectedDate = this.data.dateList[0];
      if (selectedDate && techRes) {
        this.loadTechnicianTimeSlots(techRes.id, selectedDate.fullDate, serviceRes.duration || 60);
      }
    } catch (err) {
      console.error('加载数据失败:', err);
      this.setDefaultData();
    } finally {
      wx.hideLoading();
    }
  },

  // 加载美容师信息
  async loadTechnician(technicianId) {
    console.log('loadTechnician called with id:', technicianId);
    try {
      // 使用 list 操作获取所有美容师，然后筛选
      const res = await wx.cloud.callFunction({
        name: 'technicians-api',
        data: { action: 'list' }
      });
      console.log('technicians-api response:', res);
      
      if (res.result && res.result.success && res.result.data) {
        // 在列表中查找对应 ID 的美容师
        const tech = res.result.data.find(t => t._id === technicianId || t.id === technicianId);
        console.log('found technician:', tech);
        if (tech) {
          const avatar = tech.avatar || '👤';
          return {
            id: tech._id || tech.id,
            name: tech.name,
            avatar: avatar,
            isImage: avatar && (avatar.indexOf('http://') === 0 || avatar.indexOf('https://') === 0),
            position: tech.position || '美容师',
            level: tech.level || '中级',
            rating: tech.rating || 5,
            orders: tech.orders || 0
          };
        } else {
          console.error('未找到对应 ID 的美容师:', technicianId);
        }
      } else {
        console.error('technicians-api 返回数据格式错误:', res.result);
      }
    } catch (err) {
      console.error('加载美容师失败:', err);
    }
    return null;
  },

  // 加载服务信息
  async loadService(serviceId) {
    console.log('loadService called with id:', serviceId);
    try {
      // 使用 list 操作获取所有服务，然后筛选
      const res = await wx.cloud.callFunction({
        name: 'services-api',
        data: { action: 'list' }
      });
      console.log('services-api response:', res);
      
      if (res.result && res.result.success && res.result.data) {
        // 在列表中查找对应 ID 的服务
        const service = res.result.data.find(s => s._id === serviceId || s.id === serviceId);
        console.log('found service:', service);
        if (service) {
          return {
            id: service._id || service.id,
            name: service.name,
            price: service.price,
            icon: '🛁',
            duration: service.duration || 60
          };
        } else {
          console.error('未找到对应 ID 的服务:', serviceId);
        }
      } else {
        console.error('services-api 返回数据格式错误:', res.result);
      }
    } catch (err) {
      console.error('加载服务失败:', err);
    }
    return null;
  },

  // 加载宠物信息
  async loadPet(petId) {
    console.log('loadPet called with id:', petId);
    if (!petId) {
      console.warn('petId is empty');
      return null;
    }
    try {
      const res = await wx.cloud.callFunction({
        name: 'pets-api',
        data: {
          action: 'get',
          petId: petId
        }
      });
      console.log('pets-api response:', res);

      if (res.result && res.result.success && res.result.data) {
        const pet = res.result.data;
        return {
          _id: pet._id || pet.id,
          name: pet.name,
          type: pet.type,
          breed: pet.breed
        };
      } else {
        console.error('pets-api 返回数据格式错误:', res.result);
      }
    } catch (err) {
      console.error('加载宠物失败:', err);
    }
    return null;
  },

  setDefaultData() {
    this.setData({
      selectedTechnician: {
        id: 1,
        name: '张师傅',
        avatar: '👨',
        skill: '擅长猫咪洗护、修剪',
        rating: 4.9,
        orders: 328
      },
      selectedService: {
        id: 1,
        name: '宠物洗澡',
        price: 68,
        icon: '🛁'
      },
      totalPrice: 68
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

  // 加载指定美容师的时段
  loadTechnicianTimeSlots(technicianId, date, duration) {
    this.setData({ loadingTimeSlots: true });
    
    wx.cloud.callFunction({
      name: 'availability-api',
      data: {
        action: 'getAvailableSlots',
        technicianId: technicianId,
        date: date,
        duration: duration
      }
    }).then(res => {
      this.setData({ loadingTimeSlots: false });
      
      if (res.result.success) {
        this.setData({ timeSections: res.result.data.timeSections });
      } else {
        // 如果API失败，显示基础时段
        this.setDefaultTimeSlots();
      }
    }).catch(err => {
      console.error('加载时段失败:', err);
      this.setData({ loadingTimeSlots: false });
      this.setDefaultTimeSlots();
    });
  },

  setDefaultTimeSlots() {
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
            status: isExpired ? '已过期' : (isTooLate ? '不可约' : '可约')
          });
        });
      }
      slots.push({ period: period.name, times });
    });

    this.setData({ timeSections: slots });
  },

  onDateSelect(e) {
    const index = e.currentTarget.dataset.index;
    const dateItem = this.data.dateList[index];
    
    this.setData({
      selectedDateIndex: index,
      selectedDateStr: dateItem.date,
      selectedTime: ''
    });
    
    // 加载新日期下该美容师的时段
    if (this.data.selectedTechnician) {
      this.loadTechnicianTimeSlots(
        this.data.selectedTechnician.id,
        dateItem.fullDate,
        this.data.selectedService?.duration || 60
      );
    }
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

  goBack() {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.switchTab({ url: '/pages/index/index' });
      }
    });
  },

  async onConfirm() {
    if (!this.data.selectedTime) {
      wx.showToast({ title: '请选择预约时间', icon: 'none' });
      return;
    }

    const selectedDate = this.data.dateList[this.data.selectedDateIndex];

    // 确保宠物信息已加载，如果没有则重新加载
    let petInfo = this.data.selectedPet;
    console.log('[booking-time-2] 当前宠物信息:', petInfo);
    console.log('[booking-time-2] selectedPetId:', this.data.selectedPetId);

    if (!petInfo || !petInfo.name) {
      console.log('[booking-time-2] 宠物信息不完整，重新加载...');
      if (this.data.selectedPetId) {
        petInfo = await this.loadPet(this.data.selectedPetId);
        console.log('[booking-time-2] 重新加载的宠物信息:', petInfo);
      } else {
        console.error('[booking-time-2] 没有 selectedPetId，无法加载宠物');
      }
    }

    // 构建 bookingInfo，包含完整的宠物信息
    const bookingInfo = {
      technician: this.data.selectedTechnician,
      service: this.data.selectedService,
      pet: petInfo || { _id: this.data.selectedPetId, name: '未知宠物', type: '' },
      date: selectedDate,
      time: this.data.selectedTime,
      totalPrice: this.data.totalPrice
    };

    console.log('[booking-time-2] onConfirm bookingInfo:', bookingInfo);
    console.log('[booking-time-2] pet 信息:', bookingInfo.pet);

    wx.navigateTo({
      url: `/pages/booking-confirm/booking-confirm?info=${encodeURIComponent(JSON.stringify(bookingInfo))}`
    });
  }
});
