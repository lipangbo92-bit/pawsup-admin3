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
    discountText: '10',

    // 权益图标映射
    benefitIcons: ['💰', '🎁', '⭐', '👑', '🏠', '📞', '🎉', '💎']
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

        console.log('[Membership] 获取到的levels:', levels);
        console.log('[Membership] 普通会员level 1:', levels.find(l => l.level === 1));

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
    
    // 根据档位设置颜色和图标（新配色方案）
    const colorMap = {
      1: { 
        main: '#929292', 
        dark: '#6B6B6B', 
        icon: '🏠',
        name: '会员',
        gradient: ['#A8A8A8', '#929292']
      },
      2: { 
        main: '#6D7081', 
        dark: '#4A4D5C', 
        icon: '🥈',
        name: '银卡',
        gradient: ['#8A8D9E', '#6D7081']
      },
      3: { 
        main: '#81643A', 
        dark: '#5C4528', 
        icon: '🥇',
        name: '金卡',
        gradient: ['#A08050', '#81643A']
      },
      4: { 
        main: '#4C4042', 
        dark: '#2E2628', 
        icon: '💎',
        name: '钛金卡',
        gradient: ['#6A5A5C', '#4C4042']
      }
    };

    const colors = colorMap[levelNum] || colorMap[1];
    
    // 使用管理端上传的自定义图标，如果没有则使用默认 emoji
    // 优先从 levelConfig 获取 iconUrl，如果不存在则使用默认
    const icon = (levelConfig && levelConfig.iconUrl) ? levelConfig.iconUrl : colors.icon;
    const isCustomIcon = !!(levelConfig && levelConfig.iconUrl);
    
    console.log('[Membership] updateLevelStyle - levelNum:', levelNum);
    console.log('[Membership] updateLevelStyle - levelConfig:', levelConfig);
    console.log('[Membership] updateLevelStyle - icon:', icon);
    console.log('[Membership] updateLevelStyle - isCustomIcon:', isCustomIcon);
    
    // 修复折扣显示：0.75 应该显示为 7.5 折，不是 8 折
    const discountValue = levelConfig.discount * 10;
    const discountText = discountValue % 1 === 0 
      ? discountValue.toFixed(0)  // 整数如 8.0 显示为 "8"
      : discountValue.toFixed(1); // 小数如 7.5 显示为 "7.5"

    this.setData({
      membershipColor: colors.main,
      membershipColorDark: colors.dark,
      membershipIcon: icon,
      isCustomIcon: isCustomIcon,
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
    wx.showModal({
      title: '提示',
      content: '该功能仍在开发中，请微信联系我们～',
      showCancel: false
    });
  },

  // 积分明细
  goToPointsRecords() {
    wx.showModal({
      title: '提示',
      content: '该功能仍在开发中，请微信联系我们～',
      showCancel: false
    });
  },

  // 优惠券
  goToCoupons() {
    wx.showModal({
      title: '提示',
      content: '该功能仍在开发中，请微信联系我们～',
      showCancel: false
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
