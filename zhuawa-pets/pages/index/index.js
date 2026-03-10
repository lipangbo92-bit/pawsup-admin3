// 首页 - 修复数据加载
Page({
  data: {
    technicians: [],
    services: [],
    debugMsg: '初始化...'
  },

  onLoad() {
    this.loadData();
  },

  async loadData() {
    this.setData({ debugMsg: '加载中...' });
    
    try {
      // 加载美容师
      const res = await wx.cloud.callFunction({
        name: 'technicians-api',
        data: { action: 'list' }
      });
      
      console.log('API返回:', res);
      
      if (res.result && res.result.success) {
        // 直接使用返回的数据
        const rawData = res.result.data;
        console.log('原始数据:', rawData);
        console.log('数据类型:', typeof rawData);
        console.log('是否是数组:', Array.isArray(rawData));
        console.log('数据长度:', rawData ? rawData.length : 0);
        
        if (rawData && rawData.length > 0) {
          // 转换数据格式
          const techs = rawData.map((item, idx) => {
            console.log(`处理第${idx}条:`, item);
            return {
              name: item.name || '未命名',
              level: item.level || '中级',
              position: item.position || '美容师',
              rating: item.rating || 5,
              orders: item.orders || 0,
              avatar: item.avatarUrl || item.avatar || ''
            };
          });
          
          console.log('转换后:', techs);
          
          this.setData({
            technicians: techs,
            debugMsg: `美容师:${techs.length}人`
          });
        } else {
          this.setData({ debugMsg: '数据为空' });
        }
      } else {
        this.setData({ debugMsg: 'API失败' });
      }
    } catch (err) {
      console.error('错误:', err);
      this.setData({ debugMsg: '错误:' + err.message });
    }
  },

  reload() {
    this.loadData();
  }
});
