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

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    })
  },
  globalData: {
    userInfo: null
  }
})
