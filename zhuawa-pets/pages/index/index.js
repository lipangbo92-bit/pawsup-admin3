// 首页 - 带调试信息
Page({
  data: {
    technicians: [],
    services: [],
    debugInfo: ''
  },

  onLoad() {
    console.log('=== 页面加载 ===');
    this.loadData();
  },

  async loadData() {
    console.log('=== 开始加载数据 ===');
    try {
      const [servicesRes, techsRes] = await Promise.all([
        this.loadServices(),
        this.loadTechnicians()
      ]);
      
      console.log('服务数据:', servicesRes);
      console.log('技师数据:', techsRes);
      
      this.setData({
        services: servicesRes,
        technicians: techsRes,
        debugInfo: `服务:${servicesRes.length}个, 技师:${techsRes.length}人`
      });
      
      // 显示加载结果
      wx.showToast({
        title: `加载完成`,
        icon: 'success'
      });
    } catch (err) {
      console.error('加载数据失败:', err);
      this.setData({ debugInfo: '加载失败: ' + err.message });
    }
  },

  async loadServices() {
    try {
      console.log('调用 services-api...');
      const res = await wx.cloud.callFunction({
        name: 'services-api',
        data: { action: 'list' }
      });
      
      console.log('services-api 返回:', res);
      
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
      console.log('调用 technicians-api...');
      const res = await wx.cloud.callFunction({
        name: 'technicians-api',
        data: { action: 'list' }
      });
      
      console.log('technicians-api 返回:', res);
      
      if (res.result && res.result.success) {
        const techs = res.result.data.map(t => {
          console.log('技师数据:', t.name, t);
          return {
            id: t._id,
            name: t.name,
            level: t.level || '中级',
            position: t.position || '美容师',
            rating: t.rating || 5,
            orders: t.orders || t.orderCount || 0,
            avatar: t.avatarUrl || t.avatar || ''
          };
        });
        return techs;
      }
      return [];
    } catch (err) {
      console.error('加载技师失败:', err);
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
