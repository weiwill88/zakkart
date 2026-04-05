<template>
  <div class="login-page">
    <div class="login-panel">
      <div class="login-header">
        <div class="login-badge">Phase 0</div>
        <h1>Zakkart 供应链管理系统</h1>
        <p>PC 端正式开发已启动。当前登录链路接入云函数 `auth.smsLogin`，开发期验证码固定为 `123456`。</p>
      </div>

      <el-form label-position="top" :model="form" @submit.prevent="handleLogin">
        <el-form-item label="手机号">
          <el-input v-model="form.mobile" maxlength="11" placeholder="请输入手机号" />
        </el-form-item>

        <el-form-item label="验证码">
          <div class="login-code-row">
            <el-input v-model="form.code" maxlength="6" placeholder="请输入验证码" @keyup.enter="handleLogin" />
            <el-button :disabled="countdown > 0 || sendingCode" @click="handleSendCode">
              {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
            </el-button>
          </div>
        </el-form-item>

        <el-alert
          title="开发说明"
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 20px"
        >
          <template #default>
            已预置两个初始管理员手机号：<code>17521723946</code>、<code>13262515903</code>。供应商账号需先在供应商详情页的“联系人/成员”中创建。
          </template>
        </el-alert>

        <el-button type="primary" size="large" :loading="submitting" style="width: 100%" @click="handleLogin">
          登录系统
        </el-button>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  mobile: '',
  code: ''
})

const sendingCode = ref(false)
const submitting = ref(false)
const countdown = ref(0)

let countdownTimer = null

async function handleSendCode() {
  if (!/^1\d{10}$/.test(form.mobile)) {
    ElMessage.warning('请输入正确的手机号')
    return
  }

  sendingCode.value = true

  try {
    await authStore.sendSmsCode(form.mobile)
    ElMessage.success('验证码已发送，开发阶段固定为 123456')
    startCountdown()
  } catch (error) {
    ElMessage.error(error.message || '发送失败')
  } finally {
    sendingCode.value = false
  }
}

async function handleLogin() {
  if (!/^1\d{10}$/.test(form.mobile)) {
    ElMessage.warning('请输入正确的手机号')
    return
  }

  if (!form.code) {
    ElMessage.warning('请输入验证码')
    return
  }

  submitting.value = true

  try {
    await authStore.loginBySms({
      mobile: form.mobile,
      code: form.code
    })

    ElMessage.success('登录成功')
    router.replace(String(route.query.redirect || '/dashboard'))
  } catch (error) {
    ElMessage.error(error.message || '登录失败')
  } finally {
    submitting.value = false
  }
}

function startCountdown() {
  countdown.value = 60
  clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    countdown.value -= 1

    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
      countdownTimer = null
      countdown.value = 0
    }
  }, 1000)
}

onBeforeUnmount(() => {
  clearInterval(countdownTimer)
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(26, 86, 219, 0.16), transparent 32%),
    radial-gradient(circle at bottom right, rgba(5, 150, 105, 0.12), transparent 28%),
    linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
}

.login-panel {
  width: min(460px, 100%);
  padding: 32px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.24);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(14px);
}

.login-header {
  margin-bottom: 28px;
}

.login-header h1 {
  margin: 12px 0 8px;
  font-size: 28px;
  line-height: 1.2;
  color: #0f172a;
}

.login-header p {
  color: #475569;
  line-height: 1.7;
}

.login-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #1d4ed8;
  background: rgba(59, 130, 246, 0.12);
}

.login-code-row {
  display: grid;
  grid-template-columns: 1fr 120px;
  gap: 12px;
}
</style>
