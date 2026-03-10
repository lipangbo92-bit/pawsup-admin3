// 首页 - 详细调试
Page({
  data: {
    technicians: [],
    debugMsg: '初始化'
  },

  onLoad() {
    this.loadData();
  },

  async loadData() {
    this.setData({ debugMsg: '调用中...' });
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'technicians-api',
        data: { action: 'list' }
      });
      
      console.log('=== 完整返回 ===');
      console.log('res:', res);
      console.log('res.result:', res.result);
      console.log('typeof res.result:', typeof res.result);
      console.log('Array.isArray:', Array.isArray(res.result));
      
      if (res.result) {
        console.log('res.result keys:', Object.keys(res.result));
        console.log('res.result.success:', res.result.success);
        console.log('res.result.data:', res.result.data);
      }
      
      let data = null;
      
      // 情况1: {success: true, data: [...]}
      if (res.result && res.result.data && Array.isArray(res.result.data)) {
        data = res.result.data;
        console.log('命中: 标准格式');
      }
      // 情况2: 直接是数组
      else if (Array.isArray(res.result)) {
        data = res.result;
        console.log('命中: 直接数组');
      }
      // 情况3: 直接是对象（单条记录）
      else if (res.result && typeof res.result === 'object' && res.result._id) {
        data = [res.result];
        console.log('命中: 单条记录');
      }
      
      if (!data) {
        console.error('无法识别格式');
        this.setData({ debugMsg: '格式错误' });
        return;
      }
      
      console.log('数据条数:', data.length);
      
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
        debugMsg: `成功:${techs.length}人`
      });
      
    } catch (err) {
      console.error('错误:', err);
      this.setData({ debugMsg: '错误:' + err.message });
    }
  }
});
