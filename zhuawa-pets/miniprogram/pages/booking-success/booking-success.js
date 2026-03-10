// 预约成功页
Page({
  data: {
    orderId: '',
    orderNo: ''
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ orderId: options.id });
      this.generateOrderNo();
    }
  },

  generateOrderNo() {
    const no = 'P' + Date.now().toString().slice(-8);
    this.setData({ orderNo: no });
  },

  goToOrders() {
    wx.switchTab({ url: '/pages/orders/orders' });
  },

  goToHome() {
    wx.switchTab({ url: '/pages/index/index' });
  }
});
