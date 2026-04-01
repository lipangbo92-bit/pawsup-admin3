// pages/orders/orders.js
// 订单列表页面 - 使用统一 orders-api

Page({
  data: {
    // 当前选中的标签
    activeTab: 'all',
    // 标签列表（用户友好的分类）
    tabs: [
      { key: 'all', label: '全部' },
      { key: 'unpaid', label: '待支付' },
      { key: 'pending', label: '待服务' },
      { key: 'completed', label: '已完成' }
    ],
    // 订单列表
    orders: [],
    // 是否加载中
    loading: false,
    // 是否有更多数据
    hasMore: true
  },

  onLoad() {
    this.loadOrders();
  },

  onShow() {
    // 每次显示页面时刷新订单
    this.loadOrders();
  },

  // 加载订单列表
  async loadOrders() {
    const userInfo = wx.getStorageSync('userInfo');
    console.log('[Orders] 加载订单，userInfo:', userInfo);
    
    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    // 如果没有 openid，尝试从 login 云函数获取
    let openid = userInfo.openid;
    if (!openid) {
      try {
        const loginRes = await wx.cloud.callFunction({ name: 'login' });
        openid = loginRes.result.openid;
        console.log('[Orders] 从云函数获取 openid:', openid);
        
        // 更新本地存储的 userInfo
        userInfo.openid = openid;
        wx.setStorageSync('userInfo', userInfo);
        
        // 更新 globalData
        const app = getApp();
        app.globalData.userInfo = userInfo;
      } catch (err) {
        console.error('[Orders] 获取 openid 失败:', err);
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }
    }

    this.setData({ loading: true });
    console.log('[Orders] 开始调用 orders-api，openid:', openid);

    try {
      // 构建查询参数
      let queryParams = {
        action: 'getOrders',
        userId: openid
      };
      
      // 根据标签筛选
      if (this.data.activeTab === 'unpaid') {
        // 待支付：查询未支付且未取消的订单
        queryParams.paymentStatus = 'unpaid';
        queryParams.excludeStatus = 'cancelled';  // 排除已取消的订单
      } else if (this.data.activeTab === 'pending') {
        // 待服务：查询已支付但未完成、未取消的订单
        queryParams.paymentStatus = 'paid';
        queryParams.excludeStatus = ['completed', 'cancelled'];  // 排除已完成和已取消
      } else if (this.data.activeTab === 'completed') {
        // 已完成：查询已完成的订单（无论支付状态，但通常已完成都是已支付的）
        queryParams.status = 'completed';
      }
      // 'all' 不添加筛选条件
      
      const res = await wx.cloud.callFunction({
        name: 'orders-api',
        data: queryParams
      });
      console.log('[Orders] orders-api 返回:', res);

      if (res.result && res.result.success) {
        console.log('[Orders] 订单数据:', res.result.data);
        this.setData({
          orders: res.result.data,
          loading: false
        });
      } else {
        console.error('[Orders] 加载订单失败:', res.result);
        this.setData({ loading: false });
        wx.showToast({
          title: res.result.error || '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('[Orders] 加载订单失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 切换标签
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    this.loadOrders();
  },

  // 点击订单卡片
  onOrderClick(e) {
    const orderId = e.currentTarget.dataset.id;
    const orderType = e.currentTarget.dataset.type;
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?orderId=${orderId}&orderType=${orderType}`
    });
  },

  // 获取状态标签文本（用户友好的显示）
  getStatusLabel(status, paymentStatus) {
    // 优先根据支付状态判断
    if (paymentStatus === 'unpaid') {
      return '待支付';
    }
    // 已支付但服务未完成
    if (paymentStatus === 'paid' && status !== 'completed' && status !== 'cancelled') {
      return '待服务';
    }
    // 服务完成
    if (status === 'completed') {
      return '已完成';
    }
    // 已取消
    if (status === 'cancelled') {
      return '已取消';
    }
    // 默认映射
    const labels = {
      pending: '待支付',
      confirmed: '待服务',
      in_service: '待服务'
    };
    return labels[status] || status;
  },

  // 获取订单类型文本
  getOrderTypeLabel(type) {
    const labels = {
      service: '洗护美容',
      boarding: '寄养日托',
      visiting: '上门服务'
    };
    return labels[type] || type;
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadOrders().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});
