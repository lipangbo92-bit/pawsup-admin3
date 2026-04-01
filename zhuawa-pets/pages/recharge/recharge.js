// pages/recharge/recharge.js
Page({
  data: {
    currentBalance: '0.00',
    
    // 档位卡片
    levelCards: [],
    selectedLevel: null,
    
    // 最终金额
    finalAmount: '0.00'
  },

  onLoad() {
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
        const balance = res.result.balance || 0;
        const levels = res.result.levels || [];
        
        console.log('[Recharge] 获取到的档位数据:', levels);

        this.setData({
          currentBalance: (balance / 100).toFixed(2)
        });

        this.generateLevelCards(levels);
      } else {
        console.error('[Recharge] 获取会员信息失败:', res.result);
        wx.showToast({ title: '获取档位信息失败', icon: 'none' });
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  },

  // 生成档位卡片数据
  generateLevelCards(levels) {
    // 只取 2/3/4 档（银卡、金卡、钻石）
    const targetLevels = levels.filter(l => l.level >= 2);
    
    const colorMap = {
      2: { main: '#8B5CF6', dark: '#7C3AED', icon: '🌟', name: '银卡' },
      3: { main: '#F59E0B', dark: '#D97706', icon: '👑', name: '金卡' },
      4: { main: '#EC4899', dark: '#DB2777', icon: '💎', name: '钻石' }
    };

    const cards = targetLevels.map(level => {
      const colors = colorMap[level.level];
      const rechargeAmount = level.minRecharge / 100;
      const giftAmount = level.giftConfig?.enabled ? level.giftConfig.giftValue / 100 : 0;
      const totalAmount = rechargeAmount + giftAmount;
      const discountText = Math.round(level.discount * 10);

      // 使用管理端配置的权益，如果没有则使用默认
      const benefits = level.benefits || [];

      return {
        level: level.level,
        name: level.name,
        icon: colors.icon,
        color: colors.main,
        colorDark: colors.dark,
        discount: level.discount,
        discountText: discountText,
        rechargeAmount: rechargeAmount,
        giftAmount: giftAmount,
        totalAmount: totalAmount,
        benefits: benefits
      };
    });

    this.setData({
      levelCards: cards
    });
  },

  // 选择档位
  selectLevel(e) {
    const level = e.currentTarget.dataset.level;
    const card = this.data.levelCards.find(c => c.level === level);
    
    if (card) {
      this.setData({
        selectedLevel: level,
        finalAmount: card.rechargeAmount.toFixed(2)
      });
    }
  },

  // 提交充值
  async submitRecharge() {
    const { selectedLevel, levelCards } = this.data;
    
    if (!selectedLevel) {
      wx.showToast({ title: '请选择充值档位', icon: 'none' });
      return;
    }

    const card = levelCards.find(c => c.level === selectedLevel);
    const amount = card.rechargeAmount;

    const userInfo = wx.getStorageSync('userInfo');
    let openid = userInfo.openid;
    if (!openid) {
      const loginRes = await wx.cloud.callFunction({ name: 'login' });
      openid = loginRes.result.openid;
    }

    wx.showLoading({ title: '处理中...' });

    try {
      // 创建充值订单
      const res = await wx.cloud.callFunction({
        name: 'membership-api',
        data: {
          action: 'createRechargeOrder',
          userId: openid,
          amount: Math.round(amount * 100) // 转为分
        }
      });

      wx.hideLoading();

      if (res.result && res.result.success) {
        const rechargeData = res.result;
        
        // 调起微信支付
        wx.showModal({
          title: '确认充值',
          content: `充值金额：¥${amount}\n赠送金额：¥${rechargeData.giftAmount / 100}\n会员等级：${rechargeData.targetLevelName}`,
          success: (modalRes) => {
            if (modalRes.confirm) {
              // 模拟支付成功
              this.mockPaySuccess(openid, rechargeData.rechargeId);
            }
          }
        });
      } else {
        wx.showToast({ title: res.result.error || '创建订单失败', icon: 'none' });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('充值失败:', error);
      wx.showToast({ title: '充值失败', icon: 'none' });
    }
  },

  // 模拟支付成功
  async mockPaySuccess(userId, rechargeId) {
    wx.showLoading({ title: '支付中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'membership-api',
        data: {
          action: 'onRechargeSuccess',
          userId: userId,
          rechargeId: rechargeId,
          transactionId: 'MOCK_' + Date.now()
        }
      });

      wx.hideLoading();

      if (res.result && res.result.success) {
        wx.showToast({ title: '充值成功', icon: 'success' });
        
        // 刷新数据
        setTimeout(() => {
          this.loadData();
          // 返回会员中心
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({ title: res.result.error || '支付失败', icon: 'none' });
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: '支付失败', icon: 'none' });
    }
  }
});
