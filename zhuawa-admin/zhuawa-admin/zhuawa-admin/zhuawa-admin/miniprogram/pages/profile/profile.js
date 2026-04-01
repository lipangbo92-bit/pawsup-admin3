// pages/profile/profile.js
const app = getApp()

Page({
  data: {
    userInfo: null
  },
  
  onShow() {
    this.setData({
      userInfo: app.globalData.userInfo
    })
  },
  
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    })
  },
  
  goToPets() {
    wx.navigateTo({
      url: '/pages/pets/pets'
    })
  },
  
  goToCoupons() {
    wx.navigateTo({
      url: '/pages/coupons/coupons'
    })
  },
  
  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    })
  }
})
