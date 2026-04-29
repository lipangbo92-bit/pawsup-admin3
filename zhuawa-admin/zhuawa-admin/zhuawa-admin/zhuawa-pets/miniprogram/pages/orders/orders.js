// pages/orders/orders.js
// 订单列表页面 - 使用统一 orders-api

Page({
  data: {
    orders: [],
    loading: false,
    status: 'all',
    statusList: [
      { key: 'all', label: '全部' },
      { key: 'unpaid', label: '待支付' },
      { key: 'pending', label: '待服务' },
      { key: 'completed', label: '已完成' }
    ]
  },

  onLoad() {
    this.loadOrders();
  },

  onShow() {
    this.loadOrders();
  },

  async loadOrders() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.openid) {
      this.setData({ loading: false });
      return;
    }

    this.setData({ loading: true });

    // 构建查询参数
    const activeTab = this.data.status;
    let queryParams = {
      action: 'getOrders',
      userId: userInfo.openid || userInfo._openid
    };

    // 根据标签筛选：unpaid按paymentStatus，pending/completed按status
    if (activeTab === 'unpaid') {
      queryParams.paymentStatus = 'unpaid';
    } else if (activeTab === 'pending') {
      queryParams.status = 'pending';
    } else if (activeTab === 'completed') {
      queryParams.status = 'completed';
    }
    // all 不传任何筛选条件

    console.log('=== 查询参数 ===');
    console.log('activeTab:', activeTab);
    console.log('queryParams.action:', queryParams.action);
    console.log('queryParams.userId:', queryParams.userId);
    console.log('queryParams.paymentStatus:', queryParams.paymentStatus);
    console.log('queryParams.status:', queryParams.status);
    console.log('===================');

    try {
      const res = await wx.cloud.callFunction({
        name: 'orders-api',
        data: queryParams
      });

      if (res.result && res.result.success) {
        console.log('查询参数:', queryParams);
        console.log('返回订单:', res.result.data);
        // 处理订单数据，添加显示文本
        const orders = res.result.data.map(order => ({
          ...order,
          statusText: this.getStatusText(order.status, order.paymentStatus),
          priceLabel: order.paymentStatus === 'unpaid' ? '订单金额' : '实付金额',
          displayPrice: order.finalPrice || order.totalPrice || 0
        }));
        this.setData({
          orders: orders,
          loading: false
        });
      } else {
        this.setData({ loading: false });
        wx.showToast({
          title: res.result.error || '加载失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('加载订单失败:', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 获取状态显示文本
  getStatusText(status, paymentStatus) {
    if (paymentStatus === 'unpaid') {
      return '待支付';
    }
    const statusMap = {
      pending: '待服务',
      in_service: '服务中',
      completed: '已完成',
      cancelled: '已取消'
    };
    return statusMap[status] || status;
  },

  switchStatus(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ status: status }, () => {
      this.loadOrders();
    });
  },

  goToDetail(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?orderId=${orderId}`
    });
  },

  // 取消订单
  async cancelOrder(e) {
    const orderId = e.currentTarget.dataset.id;

    wx.showModal({
      title: '确认取消',
      content: '确定要取消该预约吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' });

          try {
            const result = await wx.cloud.callFunction({
              name: 'orders-api',
              data: {
                action: 'cancelOrder',
                orderId: orderId
              }
            });

            wx.hideLoading();

            if (result.result.success) {
              wx.showToast({ title: '已取消' });
              this.loadOrders();
            } else {
              wx.showToast({ title: result.result.error, icon: 'none' });
            }
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: '操作失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 支付订单
  async payOrder(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?orderId=${orderId}&action=pay`
    });
  }
});
