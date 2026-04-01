// 宠物选择页
Page({
  data: {
    pets: [],
    selectedPet: null
  },

  onLoad() {
    this.loadPets();
  },

  async loadPets() {
    // 模拟宠物数据
    this.setData({
      pets: [
        { id: '1', name: '豆豆', type: 'dog', breed: '柯基', age: 2 },
        { id: '2', name: '咪咪', type: 'cat', breed: '英短', age: 1 }
      ]
    });
  },

  selectPet(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ selectedPet: this.data.pets[index] });
  },

  addPet() {
    wx.navigateTo({ url: '/pages/pet-register/pet-register' });
  },

  confirm() {
    if (!this.data.selectedPet) {
      wx.showToast({ title: '请选择宠物', icon: 'none' });
      return;
    }

    wx.navigateTo({
      url: '/pages/booking-confirm/booking-confirm'
    });
  }
});
