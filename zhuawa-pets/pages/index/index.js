// 首页 - 修复快速预约跳转
const app = getApp();

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
      
      if (res.result && res.result.success && res.result.data) {
        return res.result.data.map(item => {
          const avatarUrl = item.avatarUrl || item.avatar || '';
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

  // 快速预约按钮点击
  goToService(e) {
    const serviceType = e.currentTarget.dataset.service;
    
    switch(serviceType) {
      case '洗护美容':
        // 跳转到服务页面选择具体服务
        app.globalData = app.globalData || {};
        app.globalData.selectedCategory = 0; // 狗狗洗护
        wx.switchTab({ url: '/pages/services/services' });
        break;
        
      case '寄养日托':
        // 直接跳转到寄养预约页面
        wx.navigateTo({ url: '/pages/boarding/boarding' });
        break;
        
      case '上门服务':
        // 直接跳转到上门预约页面
        wx.navigateTo({ url: '/pages/visiting/visiting' });
        break;
        
      default:
        wx.switchTab({ url: '/pages/services/services' });
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
    this.loadData().finally(() => wx.stopPullDownRefresh());
  }
});
