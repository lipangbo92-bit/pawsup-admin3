// pages/services/services.js - 从数据库加载服务
Page({
  data: {
    currentCategory: 0,
    categories: ['全部', '洗护', '美容', '寄养', '医疗'],
    services: [],
    allServices: []
  },

  onLoad(options) {
    this.loadServices();
  },

  async loadServices() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'services-api',
        data: { action: 'list' }
      });
      
      console.log('服务数据:', res);
      
      if (res.result && res.result.success && res.result.data) {
        // 转换数据格式
        const services = res.result.data.map(item => ({
          id: item._id,
          name: item.name,
          desc: item.desc || item.description || '专业服务',
          price: item.price,
          unit: item.unit || '起',
          category: item.category || '洗护',
          iconText: this.getIconText(item.name),
          iconClass: this.getIconClass(item.category)
        }));
        
        this.setData({
          allServices: services,
          services: services
        });
      } else {
        // 使用本地数据
        this.setLocalServices();
      }
    } catch (err) {
      console.error('加载服务失败:', err);
      this.setLocalServices();
    }
  },

  setLocalServices() {
    const localServices = [
      { id: '1', name: '狗狗基础洗护', desc: '洗澡、吹干、基础清理', price: '99', unit: '起', category: '洗护', iconText: '🐕', iconClass: 'icon-orange' },
      { id: '2', name: '猫咪轻柔洗护', desc: '轻柔沐浴、精细护理', price: '129', unit: '起', category: '洗护', iconText: '🐱', iconClass: 'icon-pink' },
      { id: '3', name: '美容造型', desc: '专业造型、精细修剪', price: '199', unit: '起', category: '美容', iconText: '✂️', iconClass: 'icon-purple' },
      { id: '4', name: '宠物寄养', desc: '舒适笼位、每日运动', price: '80', unit: '/晚', category: '寄养', iconText: '🏠', iconClass: 'icon-blue' },
      { id: '5', name: '健康体检', desc: '基础体检项目', price: '128', unit: '起', category: '医疗', iconText: '🏥', iconClass: 'icon-red' }
    ];
    
    this.setData({
      allServices: localServices,
      services: localServices
    });
  },

  getIconText(name) {
    if (name.includes('狗')) return '🐕';
    if (name.includes('猫')) return '🐱';
    if (name.includes('美容')) return '✂️';
    if (name.includes('寄养')) return '🏠';
    if (name.includes('医疗')) return '🏥';
    if (name.includes('洗澡')) return '🛁';
    return '🐾';
  },

  getIconClass(category) {
    const map = {
      '洗护': 'icon-orange',
      '美容': 'icon-purple',
      '寄养': 'icon-blue',
      '医疗': 'icon-red'
    };
    return map[category] || 'icon-orange';
  },

  switchCategory(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const category = this.data.categories[index];
    
    let filteredServices = this.data.allServices;
    
    // 如果不是"全部"，则过滤
    if (category !== '全部') {
      filteredServices = this.data.allServices.filter(s => 
        s.category === category || s.name.includes(category)
      );
    }
    
    this.setData({
      currentCategory: index,
      services: filteredServices
    });
  },

  bookService(e) {
    const serviceId = e.currentTarget.dataset.service;
    wx.navigateTo({
      url: `/pages/booking-time-1/booking-time-1?serviceId=${serviceId}`
    });
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  onPullDownRefresh() {
    this.loadServices().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});
