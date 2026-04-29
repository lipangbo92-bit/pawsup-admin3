// 我的页面
Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    menuItems: [
      { id: 'pets', icon: '🐾', title: '我的宠物', path: '' },
      { id: 'coupons', icon: '🎫', title: '优惠券', path: '' },
      { id: 'address', icon: '📍', title: '收货地址', path: '' },
      { id: 'contact', icon: '💬', title: '联系客服', path: '' },
      { id: 'settings', icon: '⚙️', title: '设置', path: '' }
    ]
  },

  onLoad() {
    this.getUserProfile();
  },

  getUserProfile() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        });
      },
      fail: () => {
        console.log('用户拒绝授权');
      }
    });
  },

  goToPets() {
    wx.showToast({ title: '宠物管理开发中', icon: 'none' });
  },

  goToCoupons() {
    wx.showToast({ title: '优惠券开发中', icon: 'none' });
  },

  goToAddress() {
    wx.showToast({ title: '地址管理开发中', icon: 'none' });
  },

  contactService() {
    wx.showModal({
      title: '联系客服',
      content: '客服电话: 400-888-8888',
      showCancel: false
    });
  },

  goToSettings() {
    wx.showToast({ title: '设置开发中', icon: 'none' });
  }
});
