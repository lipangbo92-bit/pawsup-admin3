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
      // 并行加载 banner、服务列表和技师列表
      const [bannerRes, servicesRes, techsRes] = await Promise.all([
        this.loadBanners(),
        this.loadServices(),
        this.loadTechnicians()
      ]);
      
      this.setData({
        banner: bannerRes,
        services: servicesRes,
        technicians: techsRes
      });
    } catch (err) {
      console.error('加载数据失败:', err);
      // 使用备用数据
      this.setData({
        banner: [
          { id: 1, image: '/assets/banner1.png', url: '' }
        ],
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

  // 加载Banner列表
  async loadBanners() {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('banners')
        .where({ status: 'active' })
        .orderBy('sort', 'asc')
        .get();
      
      console.log('[loadBanners] Loaded:', res.data);
      
      if (res.data && res.data.length > 0) {
        return res.data.map(b => ({
          id: b._id,
          image: b.imageUrl || b.image || '',
          url: b.link || '',
          title: b.title || ''
        }));
      }
      
      // 如果没有数据，返回默认banner
      return [{ id: 1, image: '/assets/banner1.png', url: '' }];
    } catch (err) {
      console.error('加载Banner失败:', err);
      return [{ id: 1, image: '/assets/banner1.png', url: '' }];
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
  },

  // Banner点击事件
  onBannerTap(e) {
    const url = e.currentTarget.dataset.url;
    if (url) {
      // 如果是小程序页面路径，直接跳转
      if (url.startsWith('/pages/')) {
        wx.navigateTo({ url });
      } else if (url.startsWith('tab:')) {
        // tab页面使用 switchTab
        wx.switchTab({ url: url.replace('tab:', '') });
      }
    }
  }
});
