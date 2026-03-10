Page({
  data: {
    categories: ['狗狗洗护', '狗狗造型', '狗狗寄养', '猫猫洗护', '猫猫造型', '猫猫寄养', '上门服务'],
    allServices: [],
    filteredServices: [],
    currentCategory: 0,
    debugInfo: '加载中...'
  },

  onLoad() {
    this.loadServices();
  },

  async loadServices() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'services-api',
        data: { action: 'list' }
      });
      
      console.log('完整返回:', res);
      
      if (res.result && res.result.success) {
        const services = res.result.data || [];
        
        // 打印每条数据的详细信息
        services.forEach((s, i) => {
          console.log(`服务${i}:`, s.name, '分类:', s.category, 'ID:', s._id);
        });
        
        this.setData({ 
          allServices: services,
          debugInfo: `共${services.length}条数据`
        });
        
        this.filterServices(0);
      }
    } catch (err) {
      this.setData({ debugInfo: '错误:' + err.message });
    }
  },

  switchCategory(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.filterServices(index);
  },

  filterServices(index) {
    const category = this.data.categories[index];
    
    // 精确匹配分类
    const filtered = this.data.allServices.filter(s => {
      const match = s.category === category;
      console.log('匹配:', s.name, s.category, 'vs', category, match ? '✓' : '✗');
      return match;
    });
    
    this.setData({ 
      currentCategory: index,
      filteredServices: filtered
    });
  }
});
