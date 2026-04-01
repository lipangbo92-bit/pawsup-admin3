// app.js
App({
  onLaunch() {
    // 初始化云开发
    wx.cloud.init({
      env: 'your-env-id',
      traceUser: true
    })
    
    // 检查登录状态
    this.checkLogin()
  },
  
  globalData: {
    userInfo: null,
    openid: ''
  },
  
  checkLogin() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.globalData.userInfo = userInfo
    }
  },
  
  // 登录
  login() {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'login',
        data: {}
      }).then(res => {
        this.globalData.openid = res.result.openid
        resolve(res.result)
      }).catch(err => {
        reject(err)
      })
    })
  }
})
