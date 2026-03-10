// 预约确认页
Page({
  data: {
    service: null,
    pet: null,
    technician: null,
    date: '',
    time: '',
    remark: ''
  },

  onLoad(options) {
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];
    const bookingData = prevPage.data.bookingData || {};
    
    this.setData({
      service: bookingData.service,
      pet: bookingData.pet,
      technician: bookingData.technician,
      date: bookingData.date,
      time: bookingData.time
    });
  },

  onRemarkChange(e) {
    this.setData({ remark: e.detail.value });
  },

  async submitOrder() {
    const { service, pet, technician, date, time, remark } = this.data;
    
    if (!service || !pet || !date || !time) {
      wx.showToast({ title: '信息不完整', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '提交中...' });

    try {
      const db = wx.cloud.database();
      const result = await db.collection('appointments').add({
        data: {
          serviceId: service._id,
          serviceName: service.name,
          servicePrice: service.price,
          petId: pet._id,
          petName: pet.name,
          technicianId: technician?._id || '',
          technicianName: technician?.name || '待分配',
          date,
          time,
          remark,
          status: 'pending',
          createdAt: db.serverDate()
        }
      });

      wx.hideLoading();
      wx.redirectTo({
        url: `/pages/booking-success/booking-success?id=${result._id}`
      });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '提交失败', icon: 'none' });
      console.error(err);
    }
  }
});
