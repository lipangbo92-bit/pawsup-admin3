// 订单详情页
Page({
  data: {
    order: null,
    loading: true
  },

  onLoad(options) {
    if (options.id) {
      this.loadOrder(options.id);
    }
  },

  async loadOrder(id) {
    try {
      const db = wx.cloud.database();
      const result = await db.collection('appointments').doc(id).get();
      
      this.setData({
        order: result.data,
        loading: false
      });
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
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

  async cancelOrder() {
    const { order } = this.data;
    
    if (order.status !== 'pending' && order.status !== 'paid') {
      wx.showToast({ title: '该订单无法取消', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认取消',
      content: '确定要取消此预约吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const db = wx.cloud.database();
            await db.collection('appointments').doc(order._id).update({
              data: {
                status: 'canceled',
                cancelTime: db.serverDate()
              }
            });
            wx.showToast({ title: '已取消' });
            this.loadOrder(order._id);
          } catch (err) {
            wx.showToast({ title: '取消失败', icon: 'none' });
          }
        }
      }
    });
  },

  async payOrder() {
    wx.showToast({ title: '支付功能开发中', icon: 'none' });
  }
});
