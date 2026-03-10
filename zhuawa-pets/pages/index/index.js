// 首页 - 从数据库加载Banner
const app = getApp();

Page({
  data: {
    technicians: [],
    services: [],
    banners: [], // Banner数据
    showModal: false,
    selectedTechnician: null
  },

  onLoad() {
    this.loadData();
    this.loadBanners(); // 加载Banner
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

  // 加载Banner
  async loadBanners() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'banner-api',
        data: { action: 'list' }
      });
      
      if (res.result && res.result.success && res.result.data) {
        this.setData({ banners: res.result.data });
      }
    } catch (err) {
      console.error('加载Banner失败:', err);
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
            avatar: avatarUrl,
            intro: item.intro || item.introduction || '专业宠物美容师，拥有多年美容经验，擅长各类犬猫造型修剪，服务细致周到，深受客户好评。'
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

  // 显示美容师详情弹窗
  showTechnicianDetail(e) {
    const index = e.currentTarget.dataset.index;
    const technician = this.data.technicians[index];
    this.setData({
      showModal: true,
      selectedTechnician: technician
    });
  },

  closeModal() {
    this.setData({ showModal: false, selectedTechnician: null });
  },

  preventBubble() { return; },

  bookTechnician(e) {
    e.stopPropagation();
    const index = e.currentTarget.dataset.index;
    const technician = this.data.technicians[index];
    wx.navigateTo({ url: `/pages/booking-time-1/booking-time-1?technicianId=${technician.id || ''}` });
  },

  bookFromModal() {
    const technician = this.data.selectedTechnician;
    this.closeModal();
    wx.navigateTo({ url: `/pages/booking-time-1/booking-time-1?technicianId=${technician.id || ''}` });
  },

  goToService(e) {
    const serviceType = e.currentTarget.dataset.service;
    switch(serviceType) {
      case '洗护美容':
        app.globalData = app.globalData || {};
        app.globalData.selectedCategory = 0;
        wx.switchTab({ url: '/pages/services/services' });
        break;
      case '寄养日托':
        wx.navigateTo({ url: '/pages/boarding/boarding' });
        break;
      case '上门服务':
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
      { name: '小美', level: '高级', position: '美容师', rating: 5, orders: 128, avatar: '', intro: '拥有5年宠物美容经验，擅长贵宾、比熊等长毛犬造型。' },
      { name: '文子', level: '中级', position: '洗护师', rating: 4, orders: 86, avatar: '', intro: '专业洗护师，擅长各类犬猫洗护，手法温柔。' },
      { name: '王姐', level: '中级', position: '美容师', rating: 4, orders: 64, avatar: '', intro: '经验丰富的美容师，深受客户喜爱。' }
    ];
  },

  onPullDownRefresh() {
    Promise.all([this.loadData(), this.loadBanners()]).finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});
