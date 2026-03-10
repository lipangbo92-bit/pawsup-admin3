Page({
  data: {
    services: [],
    debugInfo: '初始化...',
    errorDetail: ''
  },

  async onLoad() {
    await this.loadServices();
  },

  async loadServices() {
    this.setData({ debugInfo: '调用云函数...' });
    
    try {
      // 直接调用，不使用 await 看原始返回
      wx.cloud.callFunction({
        name: 'services-api',
        data: { action: 'list' },
        success: (res) => {
          console.log('成功:', res);
          this.setData({ 
            debugInfo: '调用成功',
            errorDetail: JSON.stringify(res.result).substring(0, 200)
          });
          
          if (res.result && res.result.success && res.result.data) {
            this.setData({ 
              services: res.result.data,
              debugInfo: `获取${res.result.data.length}条数据`
            });
          } else {
            this.setData({ 
              debugInfo: '返回异常',
              errorDetail: JSON.stringify(res.result)
            });
          }
        },
        fail: (err) => {
          console.error('失败:', err);
          this.setData({ 
            debugInfo: '调用失败',
            errorDetail: JSON.stringify(err)
          });
        }
      });
    } catch (e) {
      this.setData({ 
        debugInfo: '异常',
        errorDetail: e.message
      });
    }
  }
});
