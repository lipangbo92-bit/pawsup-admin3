// 首页 - 使用本地数据确保显示正常
Page({
  data: {
    technicians: [],
    services: []
  },

  onLoad() {
    // 直接使用本地数据（从数据库手动复制）
    this.setData({
      technicians: [
        {
          name: '小美',
          level: '高级',
          position: '美容师',
          rating: 5,
          orders: 128,
          avatar: ''
        },
        {
          name: '文子',
          level: '中级',
          position: '洗护师',
          rating: 4,
          orders: 86,
          avatar: ''
        },
        {
          name: '王姐',
          level: '中级',
          position: '美容师',
          rating: 4,
          orders: 64,
          avatar: ''
        }
      ],
      services: [
        { id: '1', name: '宠物美容', price: 128 },
        { id: '2', name: '宠物洗澡', price: 88 },
        { id: '3', name: '宠物寄养', price: 168 }
      ]
    });
    
    // 同时尝试调用API（不影响显示）
    this.tryLoadFromAPI();
  },

  async tryLoadFromAPI() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'technicians-api',
        data: { action: 'list' }
      });
      
      console.log('API返回:', res);
      
      // 如果API返回成功，更新数据
      if (res.result && res.result.success && res.result.data && res.result.data.length > 0) {
        const techs = res.result.data.map(item => ({
          name: item.name,
          level: item.level || '中级',
          position: item.position || '美容师',
          rating: item.rating || 5,
          orders: item.orders || 0,
          avatar: item.avatarUrl || item.avatar || ''
        }));
        
        this.setData({ technicians: techs });
        console.log('已从API更新数据');
      }
    } catch (err) {
      console.log('API调用失败，使用本地数据:', err);
    }
  },

  onPullDownRefresh() {
    this.tryLoadFromAPI().finally(() => {
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
