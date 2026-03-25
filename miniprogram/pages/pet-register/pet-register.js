// 宠物注册页
Page({
  data: {
    name: '',
    type: 'dog',
    breed: '',
    age: '',
    weight: '',
    notes: '',
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

  onWeightChange(e) {
    this.setData({ weight: e.detail.value });
  },

  onNotesChange(e) {
    this.setData({ notes: e.detail.value });
  },

  switchType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ type });
  },

  async save() {
    const { name, breed, age, type, weight, notes } = this.data;
    if (!name || !breed || !age) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      // 获取用户信息
      const { result: userRes } = await wx.cloud.callFunction({
        name: 'login'
      });
      
      const userId = userRes.openid || 'unknown';

      // 保存到数据库
      const { result } = await wx.cloud.callFunction({
        name: 'pets-api',
        data: {
          httpMethod: 'POST',
          path: '/pets',
          body: JSON.stringify({
            userId: userId,
            name: name,
            type: type,
            breed: breed,
            age: parseInt(age),
            weight: weight ? parseFloat(weight) : null,
            notes: notes,
            avatar: ''
          })
        }
      });

      wx.hideLoading();

      if (result && result.success) {
        wx.showToast({ title: '保存成功' });
        setTimeout(() => {
          wx.navigateBack();
        }, 1000);
      } else {
        throw new Error(result?.error || '保存失败');
      }
    } catch (err) {
      wx.hideLoading();
      console.error('保存失败:', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  }
});
