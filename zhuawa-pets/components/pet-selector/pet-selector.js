Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    }
  },

  data: {
    // 模式：list(选择列表) / add(添加表单)
    mode: 'list',
    
    // 宠物列表
    pets: [],
    selectedPet: null,
    loading: false,
    
    // 新宠物表单
    newPet: {
      name: '',
      type: '',
      breed: '',
      age: '',
      weight: '',
      gender: '',
      avatar: '',
      notes: ''
    },
    
    // 选项
    typeOptions: [
      { label: '狗狗', value: 'dog' },
      { label: '猫咪', value: 'cat' },
      { label: '其他', value: 'other' }
    ],
    breedOptionsMap: {
      dog: ['柯基', '金毛', '泰迪', '哈士奇', '柴犬', '拉布拉多', '边牧', '萨摩耶', '博美', '法斗', '其他'],
      cat: ['英短', '美短', '布偶', '暹罗', '缅因', '波斯', '橘猫', '狸花', '蓝猫', '金渐层', '其他'],
      other: ['其他']
    },
    breedOptions: [],
    typeLabel: '',
    
    // 选择器显示
    showTypePicker: false,
    showBreedPicker: false
  },

  observers: {
    'visible': function(visible) {
      if (visible) {
        this.setData({ mode: 'list' })
        this.loadPets()
      }
    }
  },

  methods: {
    // 加载宠物列表
    async loadPets() {
      this.setData({ loading: true })
      try {
        const db = wx.cloud.database()
        const res = await db.collection('pets').orderBy('createTime', 'desc').get()
        this.setData({ 
          pets: res.data.length > 0 ? res.data : this.getMockPets(),
          loading: false 
        })
      } catch (err) {
        console.error('加载失败:', err)
        this.setData({ 
          pets: this.getMockPets(),
          loading: false 
        })
      }
    },

    getMockPets() {
      return [
        { _id: '1', name: '豆豆', type: 'dog', breed: '柯基', age: 2, weight: '10kg', gender: 'male' }
      ]
    },

    // 选择宠物
    onSelectPet(e) {
      const { index } = e.currentTarget.dataset
      this.setData({ selectedPet: this.data.pets[index] })
    },

    // 确认选择
    onConfirm() {
      if (!this.data.selectedPet) {
        wx.showToast({ title: '请选择宠物', icon: 'none' })
        return
      }
      this.triggerEvent('confirm', { pet: this.data.selectedPet })
      this.resetData()
    },

    // 显示添加表单
    onShowAddForm() {
      this.setData({ 
        mode: 'add',
        newPet: { name: '', type: '', breed: '', age: '', weight: '', gender: '', avatar: '', notes: '' },
        breedOptions: []
      })
    },

    // 关闭添加表单
    onCloseAddForm() {
      this.setData({ mode: 'list' })
    },

    // 选择头像
    onChooseAvatar() {
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          this.setData({ 'newPet.avatar': res.tempFilePaths[0] })
        }
      })
    },

    // 输入名称
    onNewPetNameInput(e) {
      this.setData({ 'newPet.name': e.detail.value })
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
    onSelectType(e) {
      const type = e.currentTarget.dataset.type
      const typeOption = this.data.typeOptions.find(t => t.value === type)
      this.setData({
        'newPet.type': type,
        'newPet.breed': '',
        typeLabel: typeOption ? typeOption.label : '',
        breedOptions: this.data.breedOptionsMap[type] || [],
        showTypePicker: false
      })
    },

    // 显示品种选择器
    onShowBreedPicker() {
      if (!this.data.newPet.type) {
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
    onSelectBreed(e) {
      this.setData({
        'newPet.breed': e.currentTarget.dataset.breed,
        showBreedPicker: false
      })
    },

    // 输入年龄
    onNewPetAgeInput(e) {
      this.setData({ 'newPet.age': e.detail.value })
    },

    // 输入体重
    onNewPetWeightInput(e) {
      this.setData({ 'newPet.weight': e.detail.value })
    },

    // 选择性别
    onNewPetGenderChange(e) {
      const genders = ['male', 'female']
      this.setData({ 'newPet.gender': genders[e.detail.value] })
    },

    // 输入备注
    onNewPetNotesInput(e) {
      this.setData({ 'newPet.notes': e.detail.value })
    },

    // 保存新宠物
    async onSaveNewPet() {
      const { name, type, breed, age, weight, gender } = this.data.newPet

      // 验证必填项
      if (!name) { wx.showToast({ title: '请输入宠物名称', icon: 'none' }); return }
      if (!type) { wx.showToast({ title: '请选择类型', icon: 'none' }); return }
      if (!breed) { wx.showToast({ title: '请选择品种', icon: 'none' }); return }
      if (!age) { wx.showToast({ title: '请输入年龄', icon: 'none' }); return }
      if (!weight) { wx.showToast({ title: '请输入体重', icon: 'none' }); return }
      if (!gender) { wx.showToast({ title: '请选择性别', icon: 'none' }); return }

      wx.showLoading({ title: '保存中...' })

      try {
        const db = wx.cloud.database()
        const res = await db.collection('pets').add({
          data: {
            name, type, breed,
            age: parseInt(age),
            weight,
            gender,
            avatar: this.data.newPet.avatar,
            notes: this.data.newPet.notes,
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        })

        // 添加成功后，选择这个新宠物
        const newPet = { 
          _id: res._id, 
          name, type, breed, 
          age: parseInt(age), 
          weight, 
          gender,
          avatar: this.data.newPet.avatar
        }

        wx.hideLoading()
        wx.showToast({ title: '添加成功', icon: 'success' })

        // 返回列表模式并选中新宠物
        this.setData({
          mode: 'list',
          selectedPet: newPet,
          pets: [newPet, ...this.data.pets]
        })
      } catch (err) {
        wx.hideLoading()
        wx.showToast({ title: '保存失败', icon: 'none' })
      }
    },

    // 关闭弹窗
    onClose() {
      this.triggerEvent('close')
      this.resetData()
    },

    // 点击遮罩
    onMaskTap() {
      this.onClose()
    },

    // 阻止冒泡
    onPopupTap() {},

    // 重置数据
    resetData() {
      this.setData({
        mode: 'list',
        selectedPet: null,
        newPet: { name: '', type: '', breed: '', age: '', weight: '', gender: '', avatar: '', notes: '' },
        showTypePicker: false,
        showBreedPicker: false
      })
    }
  }
})
