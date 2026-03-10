// pages/services/services.js - 使用本地数据（云函数部署前临时方案）
Page({
  data: {
    currentCategory: 0,
    categories: ['狗狗洗护', '狗狗造型', '狗狗寄养', '猫猫洗护', '猫猫造型', '猫猫寄养', '上门服务'],
    services: [],
    allServices: [],
    debugInfo: '本地数据模式'
  },

  onLoad() {
    this.setLocalServices();
  },

  setLocalServices() {
    // 临时本地数据 - 请根据管理端实际配置修改
    const localServices = [
      { id: '1', name: '狗狗基础洗护', desc: '洗澡、吹干、基础清理', price: 99, unit: '起', category: '狗狗洗护', image: '' },
      { id: '2', name: '狗狗精致美容', desc: '造型修剪、精细护理', price: 199, unit: '起', category: '狗狗造型', image: '' },
      { id: '3', name: '狗狗寄养', desc: '舒适笼位、每日运动', price: 80, unit: '/晚', category: '狗狗寄养', image: '' },
      { id: '4', name: '猫咪轻柔洗护', desc: '轻柔沐浴、精细护理', price: 129, unit: '起', category: '猫猫洗护', image: '' },
      { id: '5', name: '猫咪美容造型', desc: '专业造型、精细修剪', price: 168, unit: '起', category: '猫猫造型', image: '' },
      { id: '6', name: '猫咪寄养', desc: '独立空间、专业陪护', price: 88, unit: '/晚', category: '猫猫寄养', image: '' },
      { id: '7', name: '上门洗护服务', desc: '专业洗护、上门服务', price: 168, unit: '起', category: '上门服务', image: '' }
    ].map(s => ({
      ...s,
      iconText: this.getIconText(s.category),
      iconClass: this.getIconClass(s.category)
    }));
    
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
    
    this.setData({ 
      currentCategory: index, 
      services: filtered,
      debugInfo: `${category}: ${filtered.length}条`
    });
  },

  bookService(e) {
    const serviceId = e.currentTarget.dataset.service;
    wx.navigateTo({ url: `/pages/booking-time-1/booking-time-1?serviceId=${serviceId}` });
  }
});
