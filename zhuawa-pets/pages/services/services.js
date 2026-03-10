// pages/services/services.js - 从数据库获取服务
Page({
  data: {
    currentCategory: 0,
    categories: ['狗狗洗护', '狗狗造型', '狗狗寄养', '猫猫洗护', '猫猫造型', '猫猫寄养', '上门服务'],
    services: [],
    allServices: [],
    debugInfo: '加载中...'
  },

  onLoad() {
    this.loadServices();
  },

  async loadServices() {
    this.setData({ debugInfo: '调用API...' });
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'services-api',
        data: { action: 'list' }
      });
      
      console.log('API返回:', res);
      
      if (res.result && res.result.success && res.result.data) {
        const services = res.result.data.map(item => ({
          id: item._id,
          name: item.name,
          desc: item.desc || item.description || '专业服务',
          price: item.price,
          unit: item.unit || '起',
          category: item.category || '狗狗洗护',
          image: item.image || '',
          iconText: this.getIconText(item.category),
          iconClass: this.getIconClass(item.category)
        }));
        
        this.setData({ 
          allServices: services,
          debugInfo: `获取${services.length}条数据`
        });
        
        this.filterServices(0);
      } else {
        this.setData({ debugInfo: 'API返回为空' });
      }
    } catch (err) {
      console.error('加载失败:', err);
      this.setData({ debugInfo: '错误:' + err.message });
    }
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
  },

  onPullDownRefresh() {
    this.loadServices().finally(() => wx.stopPullDownRefresh());
  }
});
