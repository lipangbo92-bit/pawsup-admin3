// 首页
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
      // 并行加载服务列表和技师列表
      const [servicesRes, techsRes] = await Promise.all([
        this.loadServices(),
        this.loadTechnicians()
      ]);
      
      this.setData({
        banner: [
          { id: 1, image: '/assets/banner1.png', url: '' }
        ],
        services: servicesRes,
        technicians: techsRes
      });
    } catch (err) {
      console.error('加载数据失败:', err);
      // 使用备用数据
      this.setData({
        services: [
          { id: '1', name: '宠物美容', price: 128, image: '' },
          { id: '2', name: '宠物洗澡', price: 88, image: '' }
        ],
        technicians: [
          { id: '1', name: '加载中...', level: '请刷新', position: '' }
        ]
      });
    }
  },

  // 加载服务列表
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
      console.error('加载服务失败:', err);
      return [];
    }
  },

  // 加载技师列表
  async loadTechnicians() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'technicians-api',
        data: { action: 'list' }
      });
      
      if (res.result && res.result.success) {
        return res.result.data.map(t => ({
          id: t._id,
          name: t.name,
          // 展示等级（初级/中级/高级/资深/首席）
          level: t.level || '中级',
          // 展示岗位（美容师/洗护师/助理）
          position: t.position || '美容师',
          // 组合展示：高级美容师
          displayTitle: `${t.level || '中级'}${t.position || '美容师'}`,
          avatar: t.avatarUrl || ''
        }));
      }
      return [];
    } catch (err) {
      console.error('加载技师失败:', err);
      return [];
    }
  },

  // 下拉刷新
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
