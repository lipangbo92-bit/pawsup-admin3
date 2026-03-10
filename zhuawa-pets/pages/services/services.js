// pages/services/services.js - 详细调试版
Page({
  data: {
    currentCategory: 0,
    categories: ['狗狗洗护', '狗狗造型', '狗狗寄养', '猫猫洗护', '猫猫造型', '猫猫寄养', '上门服务'],
    services: [],
    allServices: [],
    debugInfo: '加载中...',
    rawData: '' // 显示原始数据
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
      
      console.log('完整返回:', res);
      
      if (!res.result) {
        this.setData({ debugInfo: 'result为空', rawData: JSON.stringify(res) });
        return;
      }
      
      if (!res.result.success) {
        this.setData({ debugInfo: 'success=false', rawData: res.result.error || '未知错误' });
        return;
      }
      
      const data = res.result.data || [];
      
      if (data.length === 0) {
        this.setData({ debugInfo: 'data为空数组', rawData: '返回数据为空' });
        return;
      }
      
      // 显示第一条数据的原始信息
      const firstItem = data[0];
      const rawInfo = `共${data.length}条, 第一条: ${firstItem.name}, 分类: ${firstItem.category}`;
      
      const services = data.map(item => ({
        id: item._id,
        name: item.name,
        desc: item.desc || item.description || '',
        price: item.price,
        unit: item.unit || '起',
        category: item.category || '',
        image: item.image || ''
      }));
      
      this.setData({ 
        allServices: services,
        debugInfo: rawInfo,
        rawData: JSON.stringify(services.slice(0, 2)) // 显示前2条
      });
      
      // 不过滤，先显示所有数据
      this.setData({ services: services });
      
    } catch (err) {
      console.error('错误:', err);
      this.setData({ debugInfo: '异常:' + err.message });
    }
  },

  switchCategory(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const category = this.data.categories[index];
    
    // 过滤
    const filtered = this.data.allServices.filter(s => s.category === category);
    
    this.setData({ 
      currentCategory: index, 
      services: filtered,
      debugInfo: `分类:${category}, 找到${filtered.length}条`
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
