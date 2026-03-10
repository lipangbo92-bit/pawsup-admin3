// 首页 - 正确版本
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
      const [techsRes, servicesRes] = await Promise.all([
        this.loadTechnicians(),
        this.loadServices()
      ]);
      
      const technicians = techsRes.length > 0 ? techsRes : this.getLocalTechnicians();
      
      this.setData({
        technicians: technicians,
        services: servicesRes
      });
    } catch (err) {
      this.setData({
        technicians: this.getLocalTechnicians(),
        services: []
      });
    }
  },

  async loadTechnicians() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'technicians-api',
        data: { action: 'list' }
      });
      
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
      return [];
    }
  },

  async loadServices() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'services-api',
        data: { action: 'list' }
      });
      
      if (res.result && res.result.success && res.result.data) {
        return res.result.data.map(item => ({
          id: item._id,
          name: item.name,
          price: item.price
        }));
      }
      return [];
    } catch (err) {
      return [];
    }
  },

  // 快速预约 - 点击服务项目
  goToService(e) {
    const serviceName = e.currentTarget.dataset.service;
    console.log('快速预约:', serviceName);
    // 找到对应的服务ID
    const service = this.data.services.find(s => s.name.includes(serviceName));
    if (service) {
      wx.navigateTo({ url: `/pages/booking-time-1/booking-time-1?serviceId=${service.id}` });
    } else {
      wx.showToast({ title: '服务加载中', icon: 'none' });
    }
  },

  // 热门服务 - 点击具体服务
  goToBooking(e) {
    const serviceId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/booking-time-1/booking-time-1?serviceId=${serviceId}` });
  },

  goToServices() {
    wx.switchTab({ url: '/pages/services/services' });
  },

  getLocalTechnicians() {
    return [
      { name: '小美', level: '高级', position: '美容师', rating: 5, orders: 128, avatar: '' },
      { name: '文子', level: '中级', position: '洗护师', rating: 4, orders: 86, avatar: '' },
      { name: '王姐', level: '中级', position: '美容师', rating: 4, orders: 64, avatar: '' }
    ];
  },

  onPullDownRefresh() {
    this.loadData().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});
