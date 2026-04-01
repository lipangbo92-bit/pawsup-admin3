// pages/membership/membership.js
Page({
  data: {
    // 会员信息
    membership: {
      level: 1,
      levelName: '普通会员',
      discount: 1.0,
      points: 0
    },
    balance: 0,
    
    // 档位配置
    levels: [],
    currentLevel: null,
    nextLevel: null,
    nextLevelDiff: 0,
    progressPercent: 0,
    
    // 样式
    membershipColor: '#9CA3AF',
    membershipColorDark: '#6B7280',
    membershipIcon: '⭐',
    discountText: '10'
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  // 加载数据
  async loadData() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    let openid = userInfo.openid;
    if (!openid) {
      try {
        const loginRes = await wx.cloud.callFunction({ name: 'login' });
        openid = loginRes.result.openid;
      } catch (err) {
        console.error('获取openid失败:', err);
        return;
      }
    }

    try {
      // 获取会员信息
      const res = await wx.cloud.callFunction({
        name: 'membership-api',
        data: {
          action: 'getUserMembership',
          userId: openid
        }
      });

      if (res.result && res.result.success) {
        const membership = res.result.data;
        const balance = res.result.balance || 0;
        const levels = res.result.levels || [];

        this.setData({
          membership: membership,
          balance: (balance / 100).toFixed(2),
          levels: levels
        });

        this.calculateLevelInfo(levels, membership.level);
        this.updateLevelStyle(membership.level, levels);
      }
    } catch (error) {
      console.error('加载会员信息失败:', error);
    }
  },

  // 计算档位信息
  calculateLevelInfo(levels, currentLevelNum) {
    if (!levels || levels.length === 0) return;

    const currentLevel = levels.find(l => l.level === currentLevelNum) || levels[0];
    const nextLevel = levels.find(l => l.level === currentLevelNum + 1);

    this.setData({
      currentLevel: currentLevel,
      nextLevel: nextLevel
    });

    if (nextLevel) {
      // 计算还需充值多少升级
      const nextLevelDiff = (nextLevel.minRecharge - currentLevel.minRecharge) / 100;
      
      // 计算进度（假设当前在最低档）
      const progressPercent = 0;

      this.setData({
        nextLevelDiff: nextLevelDiff,
        progressPercent: progressPercent
      });
    }
  },

  // 更新档位样式
  updateLevelStyle(levelNum, levels) {
    const levelConfig = levels.find(l => l.level === levelNum);
    if (!levelConfig) return;

    // 根据档位设置颜色和图标（参考万豪旅享家风格）
    const colorMap = {
      1: { 
        main: '#8B7355', 
        dark: '#6B5344', 
        icon: '🏠',
        name: '会员',
        gradient: ['#A0826D', '#8B7355']
      },
      2: { 
        main: '#4A90A4', 
        dark: '#2E5A6B', 
        icon: '🥈',
        name: '银卡',
        gradient: ['#5BA3B8', '#4A90A4']
      },
      3: { 
        main: '#D4AF37', 
        dark: '#B8941F', 
        icon: '🥇',
        name: '金卡',
        gradient: ['#E5C158', '#D4AF37']
      },
      4: { 
        main: '#1E3A5F', 
        dark: '#0F1F33', 
        icon: '💎',
        name: '钻石',
        gradient: ['#2E5A8B', '#1E3A5F']
      }
    };

    const colors = colorMap[levelNum] || colorMap[1];
    
    // 修复折扣显示：0.75 应该显示为 7.5 折，不是 8 折
    const discountValue = levelConfig.discount * 10;
    const discountText = discountValue % 1 === 0 
      ? discountValue.toFixed(0)  // 整数如 8.0 显示为 "8"
      : discountValue.toFixed(1); // 小数如 7.5 显示为 "7.5"

    this.setData({
      membershipColor: colors.main,
      membershipColorDark: colors.dark,
      membershipIcon: colors.icon,
      discountText: discountText
    });
  },

  // 去充值
  goToRecharge() {
    wx.navigateTo({
      url: '/pages/recharge/recharge'
    });
  },

  // 余额明细
  goToBalanceRecords() {
    wx.navigateTo({
      url: '/pages/balance-records/balance-records'
    });
  },

  // 积分明细
  goToPointsRecords() {
    wx.navigateTo({
      url: '/pages/points-records/points-records'
    });
  },

  // 优惠券
  goToCoupons() {
    wx.navigateTo({
      url: '/pages/coupons/coupons'
    });
  },

  // 积分说明
  showPointsTip() {
    wx.showModal({
      title: '积分说明',
      content: '消费1元可获得1积分\n积分可用于兑换优惠券（即将上线）',
      showCancel: false
    });
  },

  // 会员等级说明
  showLevelInfo() {
    const { levels } = this.data;
    let content = '';
    
    for (const level of levels) {
      const discount = Math.round(level.discount * 10);
      const gift = level.giftConfig?.enabled ? `，充值赠送${level.giftConfig.giftValue / 100}元` : '';
      content += `${level.name}：单次充值${level.minRecharge / 100}元起，${discount === 10 ? '无折扣' : discount + '折'}${gift}\n\n`;
    }

    wx.showModal({
      title: '会员等级说明',
      content: content,
      showCancel: false
    });
  }
});
