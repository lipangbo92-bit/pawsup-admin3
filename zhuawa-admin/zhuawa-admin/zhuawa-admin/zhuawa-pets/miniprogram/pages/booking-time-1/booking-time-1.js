// 选择时间1 - 选择日期
Page({
  data: {
    serviceId: '',
    service: null,
    dates: [],
    selectedDate: ''
  },

  onLoad(options) {
    if (options.serviceId) {
      this.setData({ serviceId: options.serviceId });
    }
    this.generateDates();
    this.loadService();
  },

  generateDates() {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        date: `${date.getMonth() + 1}-${date.getDate()}`,
        fullDate: date.toISOString().slice(0, 10),
        weekday: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]
      });
    }
    this.setData({ dates });
  },

  async loadService() {
    // 模拟数据
    this.setData({
      service: { id: '1', name: '宠物美容', price: 128 }
    });
  },

  selectDate(e) {
    const index = e.currentTarget.dataset.index;
    const date = this.data.dates[index];
    this.setData({ selectedDate: date.fullDate });
    
    wx.navigateTo({
      url: `/pages/booking-time-2/booking-time-2?date=${date.fullDate}&serviceId=${this.data.serviceId}`
    });
  }
});
