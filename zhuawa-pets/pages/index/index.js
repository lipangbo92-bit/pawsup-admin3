// 首页 - 最终版
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
      
      console.log('技师原始数据:', res.result.data);
      
      if (res.result && res.result.success) {
        return res.result.data.map(t => {
          // 获取头像（支持 avatarUrl 和 avatar 字段，支持 URL 和 base64）
          let avatar = t.avatarUrl || t.avatar || '';
          
          // 如果是 base64，确保格式正确
          if (avatar && avatar.startsWith('data:image')) {
            // base64 格式，可以直接使用
            console.log(`技师 ${t.name}: 使用 base64 头像`);
          } else if (avatar && avatar.startsWith('http')) {
            // HTTP URL，可以直接使用
            console.log(`技师 ${t.name}: 使用 URL 头像`);
          } else if (avatar) {
            // 其他格式，可能是 fileID，尝试转换
            console.log(`技师 ${t.name}: 头像格式未知`, avatar.substring(0, 50));
          } else {
            console.log(`技师 ${t.name}: 无头像`);
          }
          
          return {
            id: t._id,
            name: t.name,
            level: t.level || '中级',
            position: t.position || '美容师',
            displayTitle: `${t.level || '中级'}${t.position || '美容师'}`,
            avatar: avatar
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
