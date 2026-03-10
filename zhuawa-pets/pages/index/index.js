// 首页
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
      const [servicesRes, techsRes] = await Promise.all([
        this.loadServices(),
        this.loadTechnicians()
      ]);
      
      console.log('加载完成 - 服务:', servicesRes.length, '美容师:', techsRes.length);
      
      this.setData({
        services: servicesRes,
        technicians: techsRes
      });
    } catch (err) {
      console.error('加载数据失败:', err);
    }
  },

  async loadServices() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'services-api',
        data: { action: 'list' }
      });
      
      if (res.result && res.result.success) {
        return res.result.data.map(s => ({
          id: s._id,
          name: s.name,
          price: s.price
        }));
      }
      return [];
    } catch (err) {
      console.error('加载服务失败:', err);
      return [];
    }
  },

  async loadTechnicians() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'technicians-api',
        data: { action: 'list' }
      });
      
      console.log('美容师数据:', res.result);
      
      if (res.result && res.result.success) {
        const techs = res.result.data.map((t, index) => ({
          index: index,
          id: t._id,
          name: t.name,
          level: t.level || '中级',
          position: t.position || '美容师',
          rating: t.rating || 5,
          orders: t.orders || t.orderCount || 0,
          avatar: t.avatarUrl || t.avatar || ''
        }));
        console.log('处理后美容师:', techs);
        return techs;
      }
      return [];
    } catch (err) {
      console.error('加载美容师失败:', err);
      return [];
    }
  },

  onPullDownRefresh() {
    this.loadData().then(() => {
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
