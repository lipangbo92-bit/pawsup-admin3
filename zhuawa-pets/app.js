// app.js
App({
  onLaunch() {
    // 初始化云开发
    wx.cloud.init({
      env: 'cloud1-4gy1jyan842d73ab',
      traceUser: true,
    })

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 检查用户是否已登录
    this.checkUserLogin();
  },

  // 检查用户登录状态
  checkUserLogin() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
      console.log('[App] 用户已登录:', userInfo);
    } else {
      console.log('[App] 用户未登录');
      // 可以在这里自动跳转到登录页，或者让页面自己判断
    }
  },

  globalData: {
    userInfo: null
  }
})
