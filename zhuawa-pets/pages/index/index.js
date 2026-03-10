// 首页 - 测试版
Page({
  data: {
    technicians: [],
    debugMsg: '初始化'
  },

  onLoad() {
    // 先显示测试数据
    this.setData({
      technicians: [
        { name: '测试-小美', level: '高级', position: '美容师', rating: 5, orders: 100, avatar: '' },
        { name: '测试-文子', level: '中级', position: '洗护师', rating: 4, orders: 80, avatar: '' }
      ],
      debugMsg: '测试数据'
    });
    
    // 然后再调用API
    this.loadData();
  },

  async loadData() {
    this.setData({ debugMsg: '调用API...' });
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'technicians-api',
        data: { action: 'list' }
      });
      
      console.log('API返回:', res);
      
      if (!res || !res.result) {
        this.setData({ debugMsg: 'API返回为空' });
        return;
      }
      
      // 打印详细结构
      console.log('res.result类型:', typeof res.result);
      console.log('res.result:', JSON.stringify(res.result, null, 2));
      
      // 尝试提取数据
      let data = null;
      
      if (Array.isArray(res.result)) {
        data = res.result;
      } else if (res.result.data && Array.isArray(res.result.data)) {
        data = res.result.data;
      } else if (typeof res.result === 'object') {
        // 可能是单条记录，也可能是其他格式
        // 尝试找到数组
        for (let key in res.result) {
          if (Array.isArray(res.result[key])) {
            data = res.result[key];
            console.log('找到数组在 key:', key);
            break;
          }
        }
        
        // 如果没找到数组，且是单条记录
        if (!data && res.result._id) {
          data = [res.result];
        }
      }
      
      if (!data || data.length === 0) {
        console.log('无法提取有效数据');
        this.setData({ debugMsg: 'API无数据,显示测试数据' });
        return;
      }
      
      console.log('提取到数据:', data.length, '条');
      
      const techs = data.map(item => ({
        name: item.name || '未命名',
        level: item.level || '中级',
        position: item.position || '美容师',
        rating: item.rating || 5,
        orders: item.orders || 0,
        avatar: item.avatarUrl || item.avatar || ''
      }));
      
      this.setData({
        technicians: techs,
        debugMsg: `API成功:${techs.length}人`
      });
      
    } catch (err) {
      console.error('错误:', err);
      this.setData({ debugMsg: 'API错误,显示测试数据' });
    }
  }
});
