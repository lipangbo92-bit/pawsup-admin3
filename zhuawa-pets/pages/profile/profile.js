// pages/profile/profile.js
Page({
  data: {
    // 用户信息
    userInfo: {
      avatar: '🐱',
      name: '萌宠主人',
      level: '⭐ 普通会员',
      levelColor: '#9CA3AF'
    },
    // 统计数据
    stats: {
      orderCount: 0,
      petCount: 0,
      balance: 0,
      points: 0
    },
    // 会员信息
    membership: null
  },

  onLoad() {
    this.loadUserData();
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadUserData();
  },

  // 加载用户数据
  async loadUserData() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      console.log('[Profile] 用户未登录');
      return;
    }

    // 获取 openid
    let openid = userInfo.openid;
    if (!openid) {
      try {
        const loginRes = await wx.cloud.callFunction({ name: 'login' });
        openid = loginRes.result.openid;
        userInfo.openid = openid;
        wx.setStorageSync('userInfo', userInfo);
      } catch (err) {
        console.error('[Profile] 获取 openid 失败:', err);
        return;
      }
    }

    // 更新用户信息显示
    this.setData({
      'userInfo.name': userInfo.nickName || userInfo.name || '萌宠主人',
      'userInfo.avatar': userInfo.avatarUrl ? '' : '🐱'
    });

    // 并行获取统计数据
    await Promise.all([
      this.loadOrderCount(openid),
      this.loadPetCount(openid),
      this.loadMembership(openid)
    ]);
  },

  // 获取会员信息
  async loadMembership(userId) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'membership-api',
        data: {
          action: 'getUserMembership',
          userId: userId
        }
      });
      
      if (res.result && res.result.success) {
        const membership = res.result.data;
        const balance = res.result.balance || 0;
        const levels = res.result.levels || [];
        
        // 获取当前等级的配置
        const levelConfig = levels.find(l => l.level === membership.level);
        
        // 新的配色方案
        const colorMap = {
          1: { main: '#929292', icon: '🏠' },
          2: { main: '#6D7081', icon: '🥈' },
          3: { main: '#81643A', icon: '🥇' },
          4: { main: '#4C4042', icon: '💎' }
        };
        
        const colors = colorMap[membership.level] || colorMap[1];
        
        // 使用自定义图标或默认图标
        const icon = (levelConfig && levelConfig.iconUrl) ? levelConfig.iconUrl : colors.icon;
        const isCustomIcon = !!(levelConfig && levelConfig.iconUrl);
        
        this.setData({
          membership: membership,
          'userInfo.levelName': membership.levelName || '普通会员',
          'userInfo.levelIcon': icon,
          'userInfo.isCustomIcon': isCustomIcon,
          'userInfo.levelColor': colors.main,
          'stats.balance': balance,
          'stats.points': membership.points || 0
        });
        
        console.log('[Profile] 会员信息:', membership);
        console.log('[Profile] 等级配置:', levelConfig);
      }
    } catch (error) {
      console.error('[Profile] 获取会员信息失败:', error);
    }
  },

  // 获取订单数量
  async loadOrderCount(userId) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'orders-api',
        data: {
          action: 'getOrders',
          userId: userId
        }
      });
      
      if (res.result && res.result.success) {
        const orderCount = res.result.data ? res.result.data.length : 0;
        this.setData({ 'stats.orderCount': orderCount });
        console.log('[Profile] 订单数量:', orderCount);
      }
    } catch (error) {
      console.error('[Profile] 获取订单数量失败:', error);
    }
  },

  // 获取宠物数量
  async loadPetCount(userId) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'pets-api',
        data: {
          action: 'getPets',
          userId: userId
        }
      });
      
      if (res.result && res.result.success) {
        const petCount = res.result.data ? res.result.data.length : 0;
        this.setData({ 'stats.petCount': petCount });
        console.log('[Profile] 宠物数量:', petCount);
      }
    } catch (error) {
      console.error('[Profile] 获取宠物数量失败:', error);
    }
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
    wx.navigateTo({
      url: '/pages/membership/membership'
    });
  },

  // 优惠券
  onCoupons() {
    wx.navigateTo({
      url: '/pages/coupons/coupons'
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
