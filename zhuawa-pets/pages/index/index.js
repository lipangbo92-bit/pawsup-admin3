// 首页 - 修复API处理
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
      
      console.log('API返回:', res);
      
      if (!res || !res.result) {
        this.setData({ debugMsg: 'API返回为空' });
        return;
      }
      
      // 从之前的截图看到，res.result 直接是 {_id: ..., name: ...} 单条记录
      // 或者可能是 {data: [...]} 格式
      
      let data = [];
      
      // 情况1: res.result 直接是对象（单条记录）
      if (res.result._id && !Array.isArray(res.result)) {
        console.log('发现单条记录:', res.result.name);
        data = [res.result];
      }
      // 情况2: res.result 是数组
      else if (Array.isArray(res.result)) {
        console.log('发现数组:', res.result.length);
        data = res.result;
      }
      // 情况3: res.result.data 是数组
      else if (res.result.data && Array.isArray(res.result.data)) {
        console.log('发现标准格式:', res.result.data.length);
        data = res.result.data;
      }
      // 情况4: res.result 包含其他字段
      else {
        console.log('尝试遍历查找...');
        for (let key in res.result) {
          const val = res.result[key];
          if (Array.isArray(val) && val.length > 0) {
            console.log('在', key, '中找到数组');
            data = val;
            break;
          }
          if (val && val._id) {
            console.log('在', key, '中找到记录');
            data = [val];
            break;
          }
        }
      }
      
      console.log('最终数据:', data.length, '条');
      
      if (data.length === 0) {
        this.setData({ debugMsg: 'API无数据' });
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
