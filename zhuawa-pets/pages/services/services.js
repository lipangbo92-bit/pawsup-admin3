// pages/services/services.js - 支持图片显示
Page({
  data: {
    currentCategory: 0,
    categories: ['狗狗洗护', '狗狗造型', '狗狗寄养', '猫猫洗护', '猫猫造型', '猫猫寄养', '上门服务'],
    services: [],
    allServices: []
  },

  onLoad() {
    this.loadServices();
  },

  async loadServices() {
    try {
      wx.showLoading({ title: '加载中' });
      
      const res = await wx.cloud.callFunction({
        name: 'services-api',
        data: { action: 'list' }
      });
      
      console.log('服务数据:', res);
      
      if (res.result && res.result.success && res.result.data) {
        const services = res.result.data.map(item => ({
          id: item._id,
          name: item.name,
          desc: item.desc || item.description || '专业服务',
          price: item.price,
          unit: item.unit || '起',
          category: item.category || this.inferCategory(item.name),
          image: item.image || '', // 服务图片
          iconText: this.getIconText(item.category),
          iconClass: this.getIconClass(item.category)
        }));
        
        console.log('处理后的服务:', services);
        
        this.setData({ allServices: services });
        this.filterServices(0);
      } else {
        console.log('使用本地数据');
        this.setLocalServices();
      }
      
      wx.hideLoading();
    } catch (err) {
      console.error('加载失败:', err);
      wx.hideLoading();
      this.setLocalServices();
    }
  },

  inferCategory(name) {
    if (name.includes('狗') && name.includes('洗')) return '狗狗洗护';
    if (name.includes('狗') && (name.includes('美容') || name.includes('造型'))) return '狗狗造型';
    if (name.includes('狗') && name.includes('寄养')) return '狗狗寄养';
    if (name.includes('猫') && name.includes('洗')) return '猫猫洗护';
    if (name.includes('猫') && (name.includes('美容') || name.includes('造型'))) return '猫猫造型';
    if (name.includes('猫') && name.includes('寄养')) return '猫猫寄养';
    if (name.includes('上门')) return '上门服务';
    return '狗狗洗护';
  },

  setLocalServices() {
    const localServices = [
      { id: '1', name: '狗狗基础洗护', desc: '洗澡、吹干、基础清理', price: '99', unit: '起', category: '狗狗洗护', image: '', iconText: '🛁', iconClass: 'icon-blue' },
      { id: '2', name: '狗狗精致美容', desc: '造型修剪、精细护理', price: '199', unit: '起', category: '狗狗造型', image: '', iconText: '✂️', iconClass: 'icon-purple' },
      { id: '3', name: '狗狗寄养', desc: '舒适笼位、每日运动', price: '80', unit: '/晚', category: '狗狗寄养', image: '', iconText: '🏠', iconClass: 'icon-orange' }
    ];
    this.setData({ allServices: localServices });
    this.filterServices(0);
  },

  getIconText(category) {
    const map = {
      '狗狗洗护': '🛁', '狗狗造型': '✂️', '狗狗寄养': '🏠',
      '猫猫洗护': '🧼', '猫猫造型': '💇', '猫猫寄养': '🏨', '上门服务': '🚗'
    };
    return map[category] || '🐾';
  },

  getIconClass(category) {
    const map = {
      '狗狗洗护': 'icon-blue', '狗狗造型': 'icon-purple', '狗狗寄养': 'icon-orange',
      '猫猫洗护': 'icon-pink', '猫猫造型': 'icon-indigo', '猫猫寄养': 'icon-teal', '上门服务': 'icon-green'
    };
    return map[category] || 'icon-blue';
  },

  switchCategory(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.filterServices(index);
  },

  filterServices(index) {
    const category = this.data.categories[index];
    const filtered = this.data.allServices.filter(s => s.category === category);
    this.setData({ currentCategory: index, services: filtered });
  },

  bookService(e) {
    const serviceId = e.currentTarget.dataset.service;
    wx.navigateTo({ url: `/pages/booking-time-1/booking-time-1?serviceId=${serviceId}` });
  },

  onPullDownRefresh() {
    this.loadServices().finally(() => wx.stopPullDownRefresh());
  }
});
