// 首页 - 诊断版
Page({
  data: {
    banner: [],
    services: [],
    technicians: []
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
      
      this.setData({
        banner: [{ id: 1, image: '/assets/banner1.png', url: '' }],
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
          price: s.price,
          image: s.image || ''
        }));
      }
      return [];
    } catch (err) {
      return [];
    }
  },

  async loadTechnicians() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'technicians-api',
        data: { action: 'list' }
      });
      
      console.log('=== 技师原始数据 ===', res.result.data);
      
      if (res.result && res.result.success) {
        return res.result.data.map(t => {
          // 兼容多种可能的头像字段名
          const avatarUrl = t.avatarUrl || t.avatar || '';
          
          console.log(`技师: ${t.name}, avatarUrl: ${avatarUrl ? '有' : '无'}`);
          
          return {
            id: t._id,
            name: t.name,
            level: t.level || '中级',
            position: t.position || '美容师',
            displayTitle: `${t.level || '中级'}${t.position || '美容师'}`,
            avatar: avatarUrl,
            hasAvatar: !!avatarUrl  // 用于调试显示
          };
        });
      }
      return [];
    } catch (err) {
      console.error('加载技师失败:', err);
      return [];
    }
  },

  async onPullDownRefresh() {
    await this.loadData();
    wx.stopPullDownRefresh();
  },

  goToServices() {
    wx.switchTab({ url: '/pages/services/services' });
  },

  goToBooking(e) {
    const serviceId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/booking-time-1/booking-time-1?serviceId=${serviceId}` });
  }
});
