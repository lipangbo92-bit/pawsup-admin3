// app.js
App({
  onLaunch() {
    // 云开发初始化
    if (wx.cloud) {
      wx.cloud.init({
        env: 'your-env-id', // 替换为你的云开发环境ID
        traceUser: true
      });
    }
  },
  globalData: {
    userInfo: null
  }
});
