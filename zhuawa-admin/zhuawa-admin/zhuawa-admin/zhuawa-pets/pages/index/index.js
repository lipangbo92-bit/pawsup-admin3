// 首页 - 修复头像显示
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
      
      console.log('技师数据:', techsRes);
      
      const technicians = techsRes.length > 0 ? techsRes : this.getLocalTechnicians();
      
      this.setData({
        technicians: technicians,
        services: servicesRes
      });
    } catch (err) {
      console.error('加载失败:', err);
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
      
      console.log('API原始数据:', res.result.data);
      
      if (res.result && res.result.success && res.result.data) {
        return res.result.data.map(item => {
          // 检查头像字段
          const avatarUrl = item.avatarUrl || item.avatar || '';
          console.log('技师:', item.name, '头像:', avatarUrl ? '有' : '无', '长度:', avatarUrl.length);
          
          return {
            name: item.name,
            level: item.level || '中级',
            position: item.position || '美容师',
            rating: item.rating || 5,
            orders: item.orders || 0,
            avatar: avatarUrl
          };
        });
      }
      return [];
    } catch (err) {
      console.error('加载技师失败:', err);
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

  goToService(e) {
    const serviceName = e.currentTarget.dataset.service;
    const service = this.data.services.find(s => s.name.includes(serviceName));
    if (service) {
      wx.navigateTo({ url: `/pages/booking-time-1/booking-time-1?serviceId=${service.id}` });
    } else {
      wx.showToast({ title: '服务加载中', icon: 'none' });
    }
  },

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
