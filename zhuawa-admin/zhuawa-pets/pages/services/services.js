// pages/services/services.js - 7分类版本
Page({
  data: {
    currentCategory: 0,
    // 7个分类
    categories: ['狗狗洗护', '狗狗造型', '狗狗寄养', '猫猫洗护', '猫猫造型', '猫猫寄养', '上门服务'],
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
      
      if (res.result && res.result.success && res.result.data) {
        const services = res.result.data.map(item => ({
          id: item._id,
          name: item.name,
          desc: item.desc || item.description || '专业服务',
          price: item.price,
          unit: item.unit || '起',
          category: item.category || this.inferCategory(item.name),
          iconText: this.getIconText(item.name, item.category),
          iconClass: this.getIconClass(item.category)
        }));
        
        this.setData({ allServices: services });
        this.filterServices(0);
      } else {
        this.setLocalServices();
      }
    } catch (err) {
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
      { id: '1', name: '狗狗基础洗护', desc: '洗澡、吹干、基础清理', price: '99', unit: '起', category: '狗狗洗护', iconText: '🛁', iconClass: 'icon-blue' },
      { id: '2', name: '狗狗精致美容', desc: '造型修剪、精细护理', price: '199', unit: '起', category: '狗狗造型', iconText: '✂️', iconClass: 'icon-purple' },
      { id: '3', name: '狗狗寄养', desc: '舒适笼位、每日运动', price: '80', unit: '/晚', category: '狗狗寄养', iconText: '🏠', iconClass: 'icon-orange' },
      { id: '4', name: '猫咪轻柔洗护', desc: '轻柔沐浴、精细护理', price: '129', unit: '起', category: '猫猫洗护', iconText: '🧼', iconClass: 'icon-pink' },
      { id: '5', name: '猫咪美容造型', desc: '专业造型、精细修剪', price: '168', unit: '起', category: '猫猫造型', iconText: '💇', iconClass: 'icon-indigo' },
      { id: '6', name: '猫咪寄养', desc: '独立空间、专业陪护', price: '88', unit: '/晚', category: '猫猫寄养', iconText: '🏨', iconClass: 'icon-teal' },
      { id: '7', name: '上门洗护服务', desc: '专业洗护、上门服务', price: '168', unit: '起', category: '上门服务', iconText: '🚗', iconClass: 'icon-green' }
    ];
    
    this.setData({ allServices: localServices });
    this.filterServices(0);
  },

  getIconText(name, category) {
    if (category === '狗狗洗护' || category === '猫猫洗护') return '🛁';
    if (category === '狗狗造型' || category === '猫猫造型') return '✂️';
    if (category === '狗狗寄养' || category === '猫猫寄养') return '🏠';
    if (category === '上门服务') return '🚗';
    return '🐾';
  },

  getIconClass(category) {
    const map = {
      '狗狗洗护': 'icon-blue',
      '狗狗造型': 'icon-purple',
      '狗狗寄养': 'icon-orange',
      '猫猫洗护': 'icon-pink',
      '猫猫造型': 'icon-indigo',
      '猫猫寄养': 'icon-teal',
      '上门服务': 'icon-green'
    };
    return map[category] || 'icon-blue';
  },

  switchCategory(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.filterServices(index);
  },

  filterServices(index) {
    const category = this.data.categories[index];
    const filteredServices = this.data.allServices.filter(s => s.category === category);
    
    this.setData({
      currentCategory: index,
      services: filteredServices
    });
  },

  bookService(e) {
    const serviceId = e.currentTarget.dataset.service;
    wx.navigateTo({ url: `/pages/booking-time-1/booking-time-1?serviceId=${serviceId}` });
  },

  goBack() { wx.navigateBack({ delta: 1 }); },

  onPullDownRefresh() {
    this.loadServices().finally(() => wx.stopPullDownRefresh());
  }
});
