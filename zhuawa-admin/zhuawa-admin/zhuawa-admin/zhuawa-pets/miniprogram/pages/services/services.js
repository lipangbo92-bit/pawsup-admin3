// 服务项目页
Page({
  data: {
    services: [],
    categories: ['全部', '美容', '洗澡', '寄养', '医疗'],
    activeCategory: 0
  },

  onLoad() {
    this.loadServices();
  },
  
  // 下拉刷新
  async onPullDownRefresh() {
    await this.loadServices();
    wx.stopPullDownRefresh();
  },

  async loadServices() {
    try {
      wx.showLoading({ title: '加载中' });
      
      const res = await wx.cloud.callFunction({
        name: 'services-api',
        data: { action: 'list' }
      });
      
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        const services = res.result.data.map(s => ({
          id: s._id,
          name: s.name,
          price: s.price,
          duration: s.duration || 60,
          category: s.category || '美容',
          description: s.desc || s.description || '专业服务'
        }));
        
        this.setData({ services });
      } else {
        throw new Error('获取数据失败');
      }
    } catch (err) {
      wx.hideLoading();
      console.error('加载服务失败:', err);
      // 使用备用数据
      this.setData({
        services: [
          { id: '1', name: '宠物美容', price: 128, duration: 60, category: '美容', description: '专业美容造型' },
          { id: '2', name: '宠物洗澡', price: 88, duration: 45, category: '洗澡', description: '精致洗护体验' }
        ]
      });
    }
  },

  switchCategory(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ activeCategory: index });
  },

  goToBooking(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/booking-time-1/booking-time-1?serviceId=${id}` });
  }
});
