const { callApi } = require('../../utils/api')
const { roleManager } = require('../../utils/role')

Page({
  data: {
    mobile: '',
    code: '',
    sendingCode: false,
    submitting: false,
    countdown: 0,
    agreed: false
  },

  onUnload() {
    this.clearCountdown()
  },

  onMobileInput(e) {
    this.setData({ mobile: e.detail.value })
  },

  onCodeInput(e) {
    this.setData({ code: e.detail.value })
  },

  toggleAgreed() {
    this.setData({ agreed: !this.data.agreed })
  },

  openAgreement(e) {
    const type = e.currentTarget.dataset.type
    wx.navigateTo({ url: `/pages/agreement/index?type=${type}` })
  },

  async sendCode() {
    const { mobile, agreed } = this.data

    if (!agreed) {
      wx.showToast({ title: '请先同意用户服务协议和隐私政策', icon: 'none' })
      return
    }

    if (!/^1\d{10}$/.test(mobile)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' })
      return
    }

    this.setData({ sendingCode: true })

    try {
      await callApi('auth.smsSend', { mobile }, { skipAuth: true })
      wx.showToast({ title: '验证码已发送', icon: 'success' })
      this.startCountdown()
    } catch (error) {
      wx.showToast({ title: error.message || '发送失败', icon: 'none' })
    } finally {
      this.setData({ sendingCode: false })
    }
  },

  async submit() {
    const { mobile, code, agreed } = this.data

    if (!agreed) {
      wx.showToast({ title: '请先同意用户服务协议和隐私政策', icon: 'none' })
      return
    }

    if (!/^1\d{10}$/.test(mobile)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' })
      return
    }

    if (!code) {
      wx.showToast({ title: '请输入验证码', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    try {
      const result = await callApi('auth.smsLogin', { mobile, code }, { skipAuth: true })
      const app = getApp()
      app.setSession(result)

      wx.showToast({ title: '登录成功', icon: 'success' })
      wx.reLaunch({
        url: roleManager.getHomePath(app.getRole())
      })
    } catch (error) {
      wx.showToast({ title: error.message || '登录失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },

  startCountdown() {
    this.clearCountdown()
    this.setData({ countdown: 60 })

    this.timer = setInterval(() => {
      const next = this.data.countdown - 1

      if (next <= 0) {
        this.clearCountdown()
        this.setData({ countdown: 0 })
        return
      }

      this.setData({ countdown: next })
    }, 1000)
  },

  clearCountdown() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
})
