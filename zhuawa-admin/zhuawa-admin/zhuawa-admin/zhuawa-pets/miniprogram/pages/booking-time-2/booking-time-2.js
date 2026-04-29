// 选择时间2 - 选择时间段和技师
Page({
  data: {
    date: '',
    serviceId: '',
    service: null,
    times: [],
    selectedTime: '',
    selectedTech: null,
    technicians: []
  },

  onLoad(options) {
    if (options.date) {
      this.setData({ date: options.date });
    }
    if (options.serviceId) {
      this.setData({ serviceId: options.serviceId });
    }
    this.generateTimes();
    this.loadService();
    this.loadTechnicians();
  },

  generateTimes() {
    const times = [];
    for (let h = 9; h <= 18; h++) {
      for (let m = 0; m < 60; m += 30) {
        if (h === 18 && m > 0) break;
        const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        times.push({
          time,
          available: Math.random() > 0.3
        });
      }
    }
    this.setData({ times });
  },

  // 加载服务详情
  async loadService() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'services-api',
        data: { action: 'list' }
      });
      
      if (res.result && res.result.success) {
        const service = res.result.data.find(s => s._id === this.data.serviceId);
        if (service) {
          this.setData({
            service: {
              id: service._id,
              name: service.name,
              price: service.price
            }
          });
        }
      }
    } catch (err) {
      console.error('加载服务失败:', err);
      // 备用数据
      this.setData({
        service: { id: this.data.serviceId, name: '宠物服务', price: 128 }
      });
    }
  },

  // 加载技师列表
  async loadTechnicians() {
    try {
      wx.showLoading({ title: '加载技师' });
      
      const res = await wx.cloud.callFunction({
        name: 'technicians-api',
        data: { action: 'list' }
      });
      
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        const technicians = res.result.data
          .filter(t => {
            // 只显示在职的技师
            const status = t.status || '';
            return status !== 'inactive' && status !== '休息中' && status !== '离职';
          })
          .map(t => ({
            id: t._id,
            name: t.name,
            avatar: t.avatarUrl || '',
            // 展示等级和岗位
            level: t.level || '中级',
            position: t.position || '美容师',
            // 完整显示：高级美容师
            displayTitle: `${t.level || '中级'}${t.position || '美容师'}`
          }));
        
        this.setData({ technicians });
      } else {
        throw new Error('获取数据失败');
      }
    } catch (err) {
      wx.hideLoading();
      console.error('加载技师失败:', err);
      // 使用备用数据
      this.setData({
        technicians: [
          { id: '1', name: '加载失败', avatar: '', level: '', position: '', displayTitle: '请刷新重试' }
        ]
      });
    }
  },

  selectTime(e) {
    const index = e.currentTarget.dataset.index;
    const time = this.data.times[index];
    if (!time.available) return;
    
    this.setData({ selectedTime: time.time });
  },

  selectTech(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ selectedTech: this.data.technicians[index] });
  },

  confirm() {
    if (!this.data.selectedTime) {
      wx.showToast({ title: '请选择时间', icon: 'none' });
      return;
    }

    // 存储预约数据
    const bookingData = {
      service: this.data.service,
      date: this.data.date,
      time: this.data.selectedTime,
      technician: this.data.selectedTech
    };
    
    // 将数据存储到全局或传递到下一页
    wx.setStorageSync('bookingData', bookingData);

    wx.navigateTo({
      url: '/pages/pet-select/pet-select'
    });
  }
});
