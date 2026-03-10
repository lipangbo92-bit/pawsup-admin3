// 首页 - 显示API返回内容
Page({
  data: {
    technicians: [],
    debugMsg: '初始化',
    apiResult: ''
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
      
      console.log('API返回:', res);
      
      // 把结果转成字符串显示
      const resultStr = JSON.stringify(res.result, null, 2);
      this.setData({ apiResult: resultStr });
      
      if (!res || !res.result) {
        this.setData({ debugMsg: 'API返回为空' });
        return;
      }
      
      // 简化处理：只要有数据就显示
      let data = [];
      const r = res.result;
      
      if (r._id) {
        // 单条记录
        data = [r];
      } else if (Array.isArray(r)) {
        data = r;
      } else if (r.data) {
        data = r.data;
      }
      
      if (data.length === 0) {
        this.setData({ debugMsg: '无数据' });
        return;
      }
      
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
      this.setData({ debugMsg: '错误', apiResult: err.message });
    }
  }
});
