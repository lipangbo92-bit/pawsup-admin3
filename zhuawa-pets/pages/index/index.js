// 首页 - 优先使用API数据
Page({
  data: {
    technicians: [],
    services: []
  },

  onLoad() {
    this.loadData();
  },

  async loadData() {
    try {
      // 先尝试从API加载美容师
      const techsRes = await this.loadTechnicians();
      
      // 如果API失败或为空，使用本地数据
      const technicians = techsRes.length > 0 ? techsRes : this.getLocalTechnicians();
      
      this.setData({
        technicians: technicians,
        services: this.getLocalServices()
      });
    } catch (err) {
      console.error('加载失败:', err);
      // 使用本地数据
      this.setData({
        technicians: this.getLocalTechnicians(),
        services: this.getLocalServices()
      });
    }
  },

  async loadTechnicians() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'technicians-api',
        data: { action: 'list' }
      });
      
      console.log('API返回:', res);
      
      if (res.result && res.result.success && res.result.data) {
        return res.result.data.map(item => ({
          name: item.name,
          level: item.level || '中级',
          position: item.position || '美容师',
          rating: item.rating || 5,
          orders: item.orders || 0,
          avatar: item.avatarUrl || item.avatar || ''
        }));
      }
      return [];
    } catch (err) {
      console.log('API调用失败:', err);
      return [];
    }
  },

  getLocalTechnicians() {
    return [
      { name: '小美', level: '高级', position: '美容师', rating: 5, orders: 128, avatar: '' },
      { name: '文子', level: '中级', position: '洗护师', rating: 4, orders: 86, avatar: '' },
      { name: '王姐', level: '中级', position: '美容师', rating: 4, orders: 64, avatar: '' }
    ];
  },

  getLocalServices() {
    return [
      { id: '1', name: '宠物美容', price: 128 },
      { id: '2', name: '宠物洗澡', price: 88 },
      { id: '3', name: '宠物寄养', price: 168 }
    ];
  },

  onPullDownRefresh() {
    this.loadData().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  goToServices() {
    wx.switchTab({ url: '/pages/services/services' });
  },

  goToBooking(e) {
    const serviceId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/booking-time-1/booking-time-1?serviceId=${serviceId}` });
  }
});
