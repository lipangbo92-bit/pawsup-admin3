// pages/orders/orders.js
// 订单列表页面 - 使用统一 orders-api

Page({
  data: {
    // 当前选中的标签
    activeTab: 'all',
    // 标签列表
    tabs: [
      { key: 'all', label: '全部' },
      { key: 'pending', label: '待处理' },
      { key: 'confirmed', label: '已确认' },
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
    if (!userInfo || !userInfo.openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'orders-api',
        data: {
          action: 'getOrders',
          userId: userInfo.openid,
          status: this.data.activeTab === 'all' ? '' : this.data.activeTab
        }
      });

      if (res.result && res.result.success) {
        this.setData({
          orders: res.result.data,
          loading: false
        });
      } else {
        this.setData({ loading: false });
        wx.showToast({
          title: res.result.error || '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载订单失败:', error);
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

  // 获取状态标签文本
  getStatusLabel(status) {
    const labels = {
      pending: '待处理',
      confirmed: '已确认',
      in_service: '服务中',
      completed: '已完成',
      cancelled: '已取消'
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
