// 首页 - 强制处理
Page({
  data: {
    technicians: [],
    debugMsg: '初始化'
  },

  onLoad() {
    this.loadData();
  },

  async loadData() {
    this.setData({ debugMsg: '加载中...' });
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'technicians-api',
        data: { action: 'list' }
      });
      
      console.log('返回:', res);
      
      let data = [];
      
      // 无论如何，尝试从 res.result 提取数据
      if (res && res.result) {
        const result = res.result;
        
        // 如果 result 是数组
        if (Array.isArray(result)) {
          data = result;
        }
        // 如果 result 包含 data 数组
        else if (result.data && Array.isArray(result.data)) {
          data = result.data;
        }
        // 如果 result 是单条记录（有 _id）
        else if (result._id) {
          data = [result];
        }
      }
      
      console.log('提取的数据:', data);
      console.log('数据条数:', data.length);
      
      if (data.length === 0) {
        this.setData({ debugMsg: '无数据' });
        return;
      }
      
      // 转换
      const techs = data.map(item => ({
        name: item.name || '未命名',
        level: item.level || '中级',
        position: item.position || '美容师',
        rating: item.rating || 5,
        orders: item.orders || 0,
        avatar: item.avatarUrl || item.avatar || ''
      }));
      
      console.log('转换后:', techs);
      
      this.setData({
        technicians: techs,
        debugMsg: `成功:${techs.length}人`
      });
      
    } catch (err) {
      console.error('错误:', err);
      this.setData({ debugMsg: '错误:' + err.message });
    }
  }
});
