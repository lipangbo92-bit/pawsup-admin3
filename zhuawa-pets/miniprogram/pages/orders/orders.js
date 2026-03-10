// 订单列表页
Page({
  data: {
    orders: [],
    loading: false,
    status: 'all',
    statusList: [
      { key: 'all', label: '全部' },
      { key: 'pending', label: '待支付' },
      { key: 'paid', label: '已预约' },
      { key: 'completed', label: '已完成' },
      { key: 'canceled', label: '已取消' }
    ]
  },

  onLoad() {
    this.loadOrders();
  },

  onShow() {
    this.loadOrders();
  },

  async loadOrders() {
    this.setData({ loading: true });
    
    try {
      const db = wx.cloud.database();
      const _ = db.command;
      let query = {};
      
      if (this.data.status !== 'all') {
        query.status = this.data.status;
      }

      const result = await db.collection('appointments')
        .orderBy('createdAt', 'desc')
        .where(query)
        .get();

      this.setData({
        orders: result.data,
        loading: false
      });
    } catch (err) {
      console.error(err);
      this.setData({ loading: false });
    }
  },

  switchStatus(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ status }, () => {
      this.loadOrders();
    });
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${id}` });
  },

  getStatusText(status) {
    const map = {
      pending: '待支付',
      paid: '已预约',
      completed: '已完成',
      canceled: '已取消',
      refunded: '已退款'
    };
    return map[status] || status;
  },

  getStatusClass(status) {
    const map = {
      pending: 'status-pending',
      paid: 'status-paid',
      completed: 'status-completed',
      canceled: 'status-canceled'
    };
    return map[status] || '';
  }
});
