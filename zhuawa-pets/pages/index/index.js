// 首页 - 测试版
Page({
  data: {
    technicians: [],
    debugInfo: ''
  },

  onLoad() {
    // 页面加载时自动加载数据
    this.loadData();
  },

  // 测试加载按钮
  async testLoadData() {
    wx.showLoading({ title: '加载中' });
    await this.loadData();
    wx.hideLoading();
    wx.showToast({ title: '加载完成', icon: 'success' });
  },

  async loadData() {
    try {
      console.log('=== 开始加载技师数据 ===');
      
      const res = await wx.cloud.callFunction({
        name: 'technicians-api',
        data: { action: 'list' }
      });
      
      console.log('云函数返回:', res);
      
      if (res.result && res.result.success) {
        const techs = res.result.data.map(t => {
          const avatarUrl = t.avatarUrl || t.avatar || '';
          console.log(`技师: ${t.name}, avatar字段:`, avatarUrl.substring(0, 50) + '...');
          
          return {
            id: t._id,
            name: t.name || '未命名',
            displayTitle: `${t.level || '中级'}${t.position || '美容师'}`,
            avatar: avatarUrl
          };
        });
        
        this.setData({ technicians: techs });
        
        // 弹窗显示结果
        wx.showModal({
          title: '数据加载成功',
          content: `共加载 ${techs.length} 位技师`,
          showCancel: false
        });
      } else {
        throw new Error(res.result?.error || '返回数据异常');
      }
    } catch (err) {
      console.error('加载失败:', err);
      wx.showModal({
        title: '加载失败',
        content: err.message || '请检查网络',
        showCancel: false
      });
    }
  },

  goToServices() {
    wx.switchTab({ url: '/pages/services/services' });
  }
});
