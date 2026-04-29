// pages/profile/profile.js
Page({
  data: {
    // 用户信息
    userInfo: {
      avatar: '🐱',
      name: '萌宠主人',
      level: '⭐ 金卡会员'
    },
    // 统计数据
    stats: {
      orderCount: 12,
      petCount: 3,
      balance: 580
    }
  },

  onLoad() {
    // 页面加载时可以从服务器获取真实数据
    this.loadUserData();
  },

  // 加载用户数据
  loadUserData() {
    // TODO: 从服务器获取用户数据
    // wx.request({
    //   url: 'https://api.example.com/user/profile',
    //   success: (res) => {
    //     this.setData({
    //       userInfo: res.data.userInfo,
    //       stats: res.data.stats
    //     });
    //   }
    // });
  },

  // 点击统计项 - 预约次数
  onOrders() {
    wx.navigateTo({
      url: '/pages/orders/orders'
    });
  },

  // 点击统计项 - 我的宠物
  onMyPets() {
    wx.navigateTo({
      url: '/pages/pets/pets'
    });
  },

  // 点击统计项 - 余额
  onBalance() {
    wx.showToast({
      title: '余额功能开发中',
      icon: 'none'
    });
  },

  // 预约记录
  onOrders() {
    wx.navigateTo({
      url: '/pages/orders/orders'
    });
  },

  // 我的宠物
  onMyPets() {
    wx.navigateTo({
      url: '/pages/pets/pets'
    });
  },

  // 收藏技师
  onFavoriteTech() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 会员卡
  onMemberCard() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 优惠券
  onCoupons() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 联系我们
  onContact() {
    wx.showModal({
      title: '联系我们',
      content: '客服电话：400-123-4567\n工作时间：9:00-21:00',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 设置
  onSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  // 退出登录
  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // TODO: 执行退出登录逻辑
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
          // wx.clearStorageSync();
          // wx.redirectTo({ url: '/pages/login/login' });
        }
      }
    });
  }
});
