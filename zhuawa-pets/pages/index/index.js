// 首页
Page({
  data: {
    technicians: [],
    debugMsg: '初始化'
  },

  onLoad() {
    console.log('页面加载');
    this.loadData();
  },

  async loadData() {
    console.log('开始加载数据');
    this.setData({ debugMsg: '调用API...' });
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'technicians-api',
        data: { action: 'list' }
      });
      
      console.log('API返回:', JSON.stringify(res, null, 2));
      
      // 检查返回结构
      if (!res) {
        console.error('res为空');
        this.setData({ debugMsg: 'res为空' });
        return;
      }
      
      if (!res.result) {
        console.error('res.result为空');
        this.setData({ debugMsg: 'res.result为空' });
        return;
      }
      
      console.log('res.result:', res.result);
      console.log('res.result.success:', res.result.success);
      
      if (res.result.success !== true) {
        console.error('success不为true:', res.result);
        this.setData({ debugMsg: 'success=false' });
        return;
      }
      
      const rawData = res.result.data;
      console.log('原始数据:', rawData);
      console.log('数据长度:', rawData?.length);
      
      if (!rawData || rawData.length === 0) {
        console.log('数据为空');
        this.setData({ debugMsg: '数据为空' });
        return;
      }
      
      // 转换数据
      const techs = [];
      for (let i = 0; i < rawData.length; i++) {
        const item = rawData[i];
        console.log(`处理第${i}条:`, item);
        
        techs.push({
          name: item.name || '未命名',
          level: item.level || '中级',
          position: item.position || '美容师',
          rating: item.rating || 5,
          orders: item.orders || 0,
          avatar: item.avatarUrl || item.avatar || ''
        });
      }
      
      console.log('最终数据:', techs);
      
      this.setData({
        technicians: techs,
        debugMsg: `成功:${techs.length}人`
      });
      
      console.log('设置完成');
      
    } catch (err) {
      console.error('错误:', err);
      this.setData({ debugMsg: '异常:' + err.message });
    }
  },

  reload() {
    this.loadData();
  }
});
