// 编辑宠物页面
Page({
  data: {
    petId: '',
    pet: {
      name: '',
      type: '',
      breed: '',
      age: '',
      weight: '',
      gender: '',
      avatar: '',
      notes: ''
    },
    avatarError: false,
    
    // 选项
    typeOptions: ['狗狗', '猫咪', '其他'],
    typeValues: ['dog', 'cat', 'other'],
    breedOptionsMap: {
      dog: ['柯基', '金毛', '泰迪', '哈士奇', '柴犬', '拉布拉多', '边牧', '萨摩耶', '博美', '法斗', '其他'],
      cat: ['英短', '美短', '布偶', '暹罗', '缅因', '波斯', '橘猫', '狸花', '蓝猫', '金渐层', '其他'],
      other: ['其他']
    },
    currentBreedOptions: [],
    
    // 选择器显示
    showTypePicker: false,
    showBreedPicker: false
  },

  onLoad(options) {
    if (!options.id) {
      wx.showToast({ title: '宠物ID不能为空', icon: 'none' })
      wx.navigateBack()
      return
    }

    this.setData({ petId: options.id })
    this.loadPetDetail()
  },

  // 加载宠物详情
  async loadPetDetail() {
    wx.showLoading({ title: '加载中...' })

    try {
      const db = wx.cloud.database()
      const res = await db.collection('pets').doc(this.data.petId).get()

      const pet = res.data
      this.setData({
        pet: {
          name: pet.name || '',
          type: pet.type || '',
          breed: pet.breed || '',
          age: pet.age ? String(pet.age) : '',
          weight: pet.weight ? String(pet.weight) : '',
          gender: pet.gender || '',
          avatar: pet.avatar || '',
          notes: pet.notes || ''
        },
        currentBreedOptions: this.data.breedOptionsMap[pet.type] || []
      })
    } catch (err) {
      console.error('加载宠物详情失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // 选择头像
  async onChooseAvatar() {
    try {
      const res = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera']
      })

      const tempFilePath = res.tempFiles[0].tempFilePath

      wx.showLoading({ title: '上传中...' })

      // 上传到云存储
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `pets/avatar_${this.data.petId}_${Date.now()}.jpg`,
        filePath: tempFilePath
      })

      this.setData({
        'pet.avatar': uploadRes.fileID,
        avatarError: false
      })

      wx.hideLoading()
      wx.showToast({ title: '上传成功', icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      console.error('上传头像失败:', err)
      wx.showToast({ title: '上传失败', icon: 'none' })
    }
  },

  // 头像加载失败
  onAvatarError() {
    this.setData({ avatarError: true })
  },

  // 输入名称
  onNameInput(e) {
    this.setData({ 'pet.name': e.detail.value })
  },

  // 显示类型选择器
  onShowTypePicker() {
    this.setData({ showTypePicker: true })
  },

  // 关闭类型选择器
  onCloseTypePicker() {
    this.setData({ showTypePicker: false })
  },

  // 选择类型
  onTypeSelect(e) {
    const index = e.currentTarget.dataset.index
    const type = this.data.typeValues[index]
    this.setData({
      'pet.type': type,
      'pet.breed': '',
      currentBreedOptions: this.data.breedOptionsMap[type] || [],
      showTypePicker: false
    })
  },

  // 显示品种选择器
  onShowBreedPicker() {
    if (!this.data.pet.type) {
      wx.showToast({ title: '请先选择类型', icon: 'none' })
      return
    }
    this.setData({ showBreedPicker: true })
  },

  // 关闭品种选择器
  onCloseBreedPicker() {
    this.setData({ showBreedPicker: false })
  },

  // 选择品种
  onBreedSelect(e) {
    this.setData({
      'pet.breed': e.currentTarget.dataset.breed,
      showBreedPicker: false
    })
  },

  // 输入年龄
  onAgeInput(e) {
    this.setData({ 'pet.age': e.detail.value })
  },

  // 输入体重
  onWeightInput(e) {
    this.setData({ 'pet.weight': e.detail.value })
  },

  // 选择性别
  onGenderChange(e) {
    const genders = ['male', 'female']
    this.setData({ 'pet.gender': genders[e.detail.value] })
  },

  // 输入备注
  onNotesInput(e) {
    this.setData({ 'pet.notes': e.detail.value })
  },

  // 保存
  async onSave() {
    const { pet, petId } = this.data

    // 验证
    if (!pet.name.trim()) {
      wx.showToast({ title: '请输入宠物名称', icon: 'none' })
      return
    }
    if (!pet.type) {
      wx.showToast({ title: '请选择类型', icon: 'none' })
      return
    }
    if (!pet.breed) {
      wx.showToast({ title: '请选择品种', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...' })

    try {
      const db = wx.cloud.database()

      await db.collection('pets').doc(petId).update({
        data: {
          name: pet.name.trim(),
          type: pet.type,
          breed: pet.breed,
          age: pet.age ? parseInt(pet.age) : 0,
          weight: pet.weight,
          gender: pet.gender,
          avatar: pet.avatar,
          notes: pet.notes.trim(),
          updateTime: db.serverDate()
        }
      })

      wx.hideLoading()
      wx.showToast({ title: '保存成功', icon: 'success' })

      // 返回上一页并刷新
      setTimeout(() => {
        const pages = getCurrentPages()
        const prevPage = pages[pages.length - 2]
        if (prevPage && prevPage.loadPets) {
          prevPage.loadPets()
        }
        wx.navigateBack()
      }, 1500)
    } catch (err) {
      wx.hideLoading()
      console.error('保存失败:', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  // 删除
  onDelete() {
    const { pet } = this.data

    wx.showModal({
      title: '确认删除',
      content: `确定要删除宠物「${pet.name}」吗？`,
      confirmColor: '#EF4444',
      success: (res) => {
        if (res.confirm) {
          this.doDelete()
        }
      }
    })
  },

  // 执行删除
  async doDelete() {
    wx.showLoading({ title: '删除中...' })

    try {
      const db = wx.cloud.database()
      await db.collection('pets').doc(this.data.petId).remove()

      wx.hideLoading()
      wx.showToast({ title: '删除成功', icon: 'success' })

      // 返回上一页并刷新
      setTimeout(() => {
        const pages = getCurrentPages()
        const prevPage = pages[pages.length - 2]
        if (prevPage && prevPage.loadPets) {
          prevPage.loadPets()
        }
        wx.navigateBack()
      }, 1500)
    } catch (err) {
      wx.hideLoading()
      console.error('删除失败:', err)
      wx.showToast({ title: '删除失败', icon: 'none' })
    }
  }
})