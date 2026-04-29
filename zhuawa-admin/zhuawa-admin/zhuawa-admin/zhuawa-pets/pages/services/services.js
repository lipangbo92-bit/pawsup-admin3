// pages/services/services.js - 6分类版本
Page({
  data: {
    currentCategory: 0,
    // 6个分类：狗狗洗护美容、猫猫洗护美容、狗狗寄养、猫猫寄养、狗狗上门、猫猫上门
    categories: ['狗狗洗护美容', '猫猫洗护美容', '狗狗寄养', '猫猫寄养', '狗狗上门', '猫猫上门'],
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
          category: item.category || this.inferCategory(item.name),
          iconText: this.getIconText(item.name),
          iconClass: this.getIconClass(item.category)
        }));
        
        this.setData({
          allServices: services
        });
        
        // 默认显示第一个分类的服务
        this.filterServices(0);
      } else {
        this.setLocalServices();
      }
    } catch (err) {
      console.error('加载服务失败:', err);
      this.setLocalServices();
    }
  },

  // 根据服务名称推断分类
  inferCategory(name) {
    if (name.includes('狗') && (name.includes('洗') || name.includes('美容'))) return '狗狗洗护美容';
    if (name.includes('猫') && (name.includes('洗') || name.includes('美容'))) return '猫猫洗护美容';
    if (name.includes('狗') && name.includes('寄养')) return '狗狗寄养';
    if (name.includes('猫') && name.includes('寄养')) return '猫猫寄养';
    if (name.includes('狗') && name.includes('上门')) return '狗狗上门';
    if (name.includes('猫') && name.includes('上门')) return '猫猫上门';
    return '狗狗洗护美容'; // 默认
  },

  setLocalServices() {
    const localServices = [
      { id: '1', name: '狗狗基础洗护', desc: '洗澡、吹干、基础清理', price: '99', unit: '起', category: '狗狗洗护美容', iconText: '🐕', iconClass: 'icon-orange' },
      { id: '2', name: '狗狗精致美容', desc: '造型修剪、精细护理', price: '199', unit: '起', category: '狗狗洗护美容', iconText: '✂️', iconClass: 'icon-purple' },
      { id: '3', name: '猫咪轻柔洗护', desc: '轻柔沐浴、精细护理', price: '129', unit: '起', category: '猫猫洗护美容', iconText: '🐱', iconClass: 'icon-pink' },
      { id: '4', name: '猫咪美容造型', desc: '专业造型、精细修剪', price: '168', unit: '起', category: '猫猫洗护美容', iconText: '💇', iconClass: 'icon-indigo' },
      { id: '5', name: '狗狗寄养', desc: '舒适笼位、每日运动', price: '80', unit: '/晚', category: '狗狗寄养', iconText: '🏠', iconClass: 'icon-blue' },
      { id: '6', name: '猫咪寄养', desc: '独立空间、专业陪护', price: '88', unit: '/晚', category: '猫猫寄养', iconText: '🏨', iconClass: 'icon-teal' },
      { id: '7', name: '狗狗上门服务', desc: '专业洗护、上门服务', price: '168', unit: '起', category: '狗狗上门', iconText: '🚗', iconClass: 'icon-green' },
      { id: '8', name: '猫咪上门服务', desc: '轻柔洗护、上门护理', price: '188', unit: '起', category: '猫猫上门', iconClass: 'icon-lime' }
    ];
    
    this.setData({
      allServices: localServices
    });
    this.filterServices(0);
  },

  getIconText(name) {
    if (name.includes('狗')) return '🐕';
    if (name.includes('猫')) return '🐱';
    if (name.includes('美容')) return '✂️';
    if (name.includes('寄养')) return '🏠';
    if (name.includes('上门')) return '🚗';
    return '🐾';
  },

  getIconClass(category) {
    const map = {
      '狗狗洗护美容': 'icon-orange',
      '猫猫洗护美容': 'icon-pink',
      '狗狗寄养': 'icon-blue',
      '猫猫寄养': 'icon-teal',
      '狗狗上门': 'icon-green',
      '猫猫上门': 'icon-lime'
    };
    return map[category] || 'icon-orange';
  },

  switchCategory(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.filterServices(index);
  },

  filterServices(index) {
    const category = this.data.categories[index];
    
    // 过滤对应分类的服务
    const filteredServices = this.data.allServices.filter(s => 
      s.category === category
    );
    
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
