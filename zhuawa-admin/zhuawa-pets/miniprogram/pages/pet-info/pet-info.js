// 宠物信息页
Page({
  data: {
    pet: null
  },

  onLoad(options) {
    if (options.id) {
      this.loadPet(options.id);
    }
  },

  async loadPet(id) {
    // 模拟数据
    this.setData({
      pet: { id: '1', name: '豆豆', type: 'dog', breed: '柯基', age: 2 }
    });
  }
});
