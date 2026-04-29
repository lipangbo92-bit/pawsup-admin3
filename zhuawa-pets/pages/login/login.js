// pages/login/login.js
// 用户登录页面 - 获取用户昵称和手机号

const app = getApp();

Page({
  data: {
    loading: false,
    userInfo: null,
    hasUserInfo: false,
    canIUseGetUserProfile: false
  },

  onLoad() {
    // 检查是否可以使用 getUserProfile（微信 2.10.4+）
    if (wx.getUserProfile) {
      this.setData({ canIUseGetUserProfile: true });
    }

    // 检查本地是否有用户信息
    this.checkLoginStatus();
  },

  onShow() {
    this.checkLoginStatus();
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        hasUserInfo: true
      });
      app.globalData.userInfo = userInfo;
    }
  },

  // 获取用户昵称（新版接口）
  getUserProfile() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        console.log('获取用户信息成功:', res.userInfo);
        this.handleLoginSuccess(res.userInfo);
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err);
        wx.showToast({ title: '需要授权才能继续', icon: 'none' });
      }
    });
  },

  // 获取用户昵称（旧版接口）
  getUserInfo(e) {
    if (e.detail.userInfo) {
      this.handleLoginSuccess(e.detail.userInfo);
    } else {
      wx.showToast({ title: '需要授权才能继续', icon: 'none' });
    }
  },

  // 登录成功处理
  async handleLoginSuccess(userInfo) {
    // 获取 openid
    let openid = '';
    try {
      const loginRes = await wx.cloud.callFunction({ name: 'login' });
      openid = loginRes.result.openid;
    } catch (err) {
      console.error('获取 openid 失败:', err);
    }

    // 添加 openid 到用户信息
    const userInfoWithOpenid = {
      ...userInfo,
      openid: openid
    };

    this.setData({
      userInfo: userInfoWithOpenid,
      hasUserInfo: true
    });
    app.globalData.userInfo = userInfoWithOpenid;
    wx.setStorageSync('userInfo', userInfoWithOpenid);

    // 尝试保存到云数据库
    try {
      await this.saveUserInfo(userInfoWithOpenid);
    } catch (err) {
      console.log('保存到云端失败:', err);
    }

    wx.showToast({ title: '登录成功', icon: 'success' });

    // 延迟后进入首页
    setTimeout(() => {
      wx.switchTab({ url: '/pages/index/index' });
    }, 1000);
  },

  // 保存用户信息到云数据库
  async saveUserInfo(userInfo) {
    const loginRes = await wx.cloud.callFunction({ name: 'login' });
    const openid = loginRes.result.openid;

    await wx.cloud.callFunction({
      name: 'users-api',
      data: {
        action: 'saveUser',
        data: {
          _openid: openid,
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl
        }
      }
    });
  },

  // 使用测试账号
  async skipLogin() {
    // 获取 openid
    let openid = '';
    try {
      const loginRes = await wx.cloud.callFunction({ name: 'login' });
      openid = loginRes.result.openid;
    } catch (err) {
      console.error('获取 openid 失败:', err);
    }

    const testUserInfo = {
      nickName: '测试用户',
      avatarUrl: '',
      phoneNumber: '13800138000',
      openid: openid
    };

    this.setData({
      userInfo: testUserInfo,
      hasUserInfo: true
    });
    app.globalData.userInfo = testUserInfo;
    wx.setStorageSync('userInfo', testUserInfo);

    try {
      await this.saveUserInfo(testUserInfo);
    } catch (err) {
      console.log('保存到云端失败:', err);
    }

    wx.showToast({ title: '已使用测试账号', icon: 'none' });

    setTimeout(() => {
      wx.switchTab({ url: '/pages/index/index' });
    }, 1000);
  },

  // 进入首页
  goToHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('userInfo');
          app.globalData.userInfo = null;
          this.setData({
            userInfo: null,
            hasUserInfo: false
          });
        }
      }
    });
  }
});
