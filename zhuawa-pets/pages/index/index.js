// 首页 - 修复图片加载错误
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
      const techsRes = await this.loadTechnicians();
      const technicians = techsRes.length > 0 ? techsRes : this.getLocalTechnicians();
      
      this.setData({
        technicians: technicians,
        services: this.getLocalServices()
      });
    } catch (err) {
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
      
      if (res.result && res.result.success && res.result.data) {
        return res.result.data.map(item => {
          // 处理头像URL - 如果是base64且太长，清空避免渲染错误
          let avatar = item.avatarUrl || item.avatar || '';
          if (avatar && avatar.length > 1000) {
            console.log('头像数据太长，可能是base64，跳过显示');
            avatar = ''; // 不显示base64头像，避免渲染错误
          }
          
          return {
            name: item.name,
            level: item.level || '中级',
            position: item.position || '美容师',
            rating: item.rating || 5,
            orders: item.orders || 0,
            avatar: avatar
          };
        });
      }
      return [];
    } catch (err) {
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
