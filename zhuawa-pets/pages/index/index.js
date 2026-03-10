// 首页 - 详细调试版
Page({
  data: {
    technicians: [],
    services: [],
    debugMsg: '初始化...'
  },

  onLoad() {
    console.log('=== onLoad ===');
    this.setData({ debugMsg: '页面加载中...' });
    this.loadData();
  },

  async loadData() {
    console.log('=== loadData ===');
    this.setData({ debugMsg: '开始加载数据...' });
    
    try {
      // 先加载美容师
      console.log('开始加载美容师...');
      this.setData({ debugMsg: '加载美容师...' });
      const techsRes = await this.loadTechnicians();
      console.log('美容师加载完成:', techsRes);
      
      // 再加载服务
      console.log('开始加载服务...');
      this.setData({ debugMsg: '加载服务...' });
      const servicesRes = await this.loadServices();
      console.log('服务加载完成:', servicesRes);
      
      console.log('设置数据:', { services: servicesRes.length, techs: techsRes.length });
      
      this.setData({
        services: servicesRes,
        technicians: techsRes,
        debugMsg: `服务:${servicesRes.length} 美容师:${techsRes.length}`
      });
      
      console.log('数据设置完成');
    } catch (err) {
      console.error('加载数据失败:', err);
      this.setData({ debugMsg: '错误:' + err.message });
    }
  },

  async loadServices() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'services-api',
        data: { action: 'list' }
      });
      
      console.log('services-api 返回:', res);
      
      if (res.result && res.result.success) {
        return res.result.data || [];
      }
      return [];
    } catch (err) {
      console.error('加载服务失败:', err);
      return [];
    }
  },

  async loadTechnicians() {
    try {
      console.log('调用 technicians-api...');
      const res = await wx.cloud.callFunction({
        name: 'technicians-api',
        data: { action: 'list' }
      });
      
      console.log('technicians-api 原始返回:', res);
      console.log('res.result:', res.result);
      
      if (!res.result) {
        console.error('res.result 为空');
        return [];
      }
      
      if (!res.result.success) {
        console.error('API 返回失败:', res.result.error);
        return [];
      }
      
      const data = res.result.data || [];
      console.log('API 返回数据条数:', data.length);
      console.log('第一条数据:', data[0]);
      
      return data;
    } catch (err) {
      console.error('加载美容师失败:', err);
      return [];
    }
  },

  reload() {
    this.loadData();
  }
});
