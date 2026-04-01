// 添加宠物页面
Page({
  data: {
    petName: '',
    petType: '', // dog, cat, other
    breed: '',
    age: '',
    weight: '',
    gender: 'male',
    avatar: '',
    notes: '',
    
    // 品种选项
    breedOptions: {
      dog: ['柯基', '金毛', '泰迪', '哈士奇', '柴犬', '拉布拉多', '边牧', '萨摩耶', '博美', '法斗', '其他'],
      cat: ['英短', '美短', '布偶', '暹罗', '缅因', '波斯', '橘猫', '狸花', '蓝猫', '金渐层', '其他'],
      other: ['其他']
    },
    currentBreedOptions: [],
    showTypePicker: false,
    showBreedPicker: false,
    typeOptions: ['狗狗', '猫咪', '其他'],
    typeValues: ['dog', 'cat', 'other']
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '添加宠物' })
  },

  // 选择头像
  onChooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ avatar: res.tempFilePaths[0] })
      }
    })
  },

  // 输入宠物名称
  onNameInput(e) {
    this.setData({ petName: e.detail.value })
  },

  // 显示类型选择器
  onShowTypePicker() {
    this.setData({ showTypePicker: true })
  },

  // 选择宠物类型
  onTypeSelect(e) {
    const index = e.currentTarget.dataset.index
    const typeValue = this.data.typeValues[index]
    const typeLabel = this.data.typeOptions[index]
    
    this.setData({
      petType: typeValue,
      showTypePicker: false,
      breed: '', // 重置品种
      currentBreedOptions: this.data.breedOptions[typeValue] || []
    })
  },

  // 关闭类型选择器
  onCloseTypePicker() {
    this.setData({ showTypePicker: false })
  },

  // 显示品种选择器
  onShowBreedPicker() {
    if (!this.data.petType) {
      wx.showToast({ title: '请先选择宠物类型', icon: 'none' })
      return
    }
    this.setData({ showBreedPicker: true })
  },

  // 选择品种
  onBreedSelect(e) {
    const breed = e.currentTarget.dataset.breed
    this.setData({
      breed: breed,
      showBreedPicker: false
    })
  },

  // 关闭品种选择器
  onCloseBreedPicker() {
    this.setData({ showBreedPicker: false })
  },

  // 输入年龄
  onAgeInput(e) {
    this.setData({ age: e.detail.value })
  },

  // 输入体重
  onWeightInput(e) {
    this.setData({ weight: e.detail.value })
  },

  // 选择性别
  onGenderChange(e) {
    this.setData({ gender: e.detail.value })
  },

  // 输入备注
  onNotesInput(e) {
    this.setData({ notes: e.detail.value })
  },

  // 提交
  async onSubmit() {
    const { petName, petType, breed, age, weight, gender, avatar, notes } = this.data

    // 验证
    if (!petName) {
      wx.showToast({ title: '请输入宠物名称', icon: 'none' })
      return
    }
    if (!petType) {
      wx.showToast({ title: '请选择宠物类型', icon: 'none' })
      return
    }
    if (!breed) {
      wx.showToast({ title: '请选择品种', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...' })

    try {
      // 如果有头像，先上传
      let avatarUrl = avatar
      if (avatar && avatar.startsWith('http://tmp')) {
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `pets/${Date.now()}.jpg`,
          filePath: avatar
        })
        avatarUrl = uploadRes.fileID
      }

      // 保存到数据库
      const db = wx.cloud.database()
      await db.collection('pets').add({
        data: {
          name: petName,
          type: petType,
          breed: breed,
          age: parseInt(age) || 0,
          weight: weight,
          gender: gender,
          avatar: avatarUrl,
          notes: notes,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })

      wx.hideLoading()
      wx.showToast({ title: '添加成功', icon: 'success' })

      // 返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (err) {
      wx.hideLoading()
      console.error('添加宠物失败:', err)
      wx.showToast({ title: '添加失败', icon: 'none' })
    }
  },

  // 取消
  onCancel() {
    wx.navigateBack()
  }
})
