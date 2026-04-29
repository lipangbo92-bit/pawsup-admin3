// 宠物注册页
Page({
  data: {
    name: '',
    type: 'dog',
    breed: '',
    age: '',
    types: [
      { key: 'dog', label: '狗狗' },
      { key: 'cat', label: '猫咪' },
      { key: 'other', label: '其他' }
    ]
  },

  onNameChange(e) {
    this.setData({ name: e.detail.value });
  },

  onBreedChange(e) {
    this.setData({ breed: e.detail.value });
  },

  onAgeChange(e) {
    this.setData({ age: e.detail.value });
  },

  switchType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ type });
  },

  save() {
    const { name, breed, age, type } = this.data;
    if (!name || !breed || !age) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    wx.showToast({ title: '保存成功' });
    setTimeout(() => {
      wx.navigateBack();
    }, 1000);
  }
});
