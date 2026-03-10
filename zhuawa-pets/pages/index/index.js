// 首页 - 兼容版
Page({
  data: {
    technicians: [],
    debugMsg: '初始化'
  },

  onLoad() {
    this.loadData();
  },

  async loadData() {
    this.setData({ debugMsg: '调用API...' });
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'technicians-api',
        data: { action: 'list' }
      });
      
      console.log('完整返回:', res);
      
      let data = null;
      
      // 兼容两种返回格式
      if (res.result && res.result.success === true && res.result.data) {
        // 正常格式: {success: true, data: [...]}
        data = res.result.data;
        console.log('使用正常格式');
      } else if (res.result && Array.isArray(res.result)) {
        // 异常格式: 直接返回数组
        data = res.result;
        console.log('使用数组格式');
      } else if (res.result && res.result._id) {
        // 异常格式: 直接返回单条记录
        data = [res.result];
        console.log('使用单条记录格式');
      } else {
        console.error('未知格式:', res.result);
        this.setData({ debugMsg: '未知数据格式' });
        return;
      }
      
      console.log('数据条数:', data.length);
      
      if (!data || data.length === 0) {
        this.setData({ debugMsg: '数据为空' });
        return;
      }
      
      // 转换数据
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
      this.setData({ debugMsg: '异常:' + err.message });
    }
  },

  reload() {
    this.loadData();
  }
});
