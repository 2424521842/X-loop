<template>
  <section class="login-page mobile-page">
    <div class="login-card mobile-card">
      <div class="login-head">
        <div class="brand-orb">X</div>
        <h1>{{ t('login.title') }}</h1>
        <p>{{ t('login.subtitle') }}</p>
      </div>

      <el-form label-position="top" @submit.prevent>
        <template v-if="step === 1">
          <el-form-item :label="t('login.schoolEmail')">
            <el-input
              v-model.trim="email"
              placeholder="name@student.xjtlu.edu.cn"
              size="large"
              autocomplete="email"
              @keyup.enter="handleSendCode"
            />
          </el-form-item>
          <el-button
            class="full-button"
            type="primary"
            size="large"
            :loading="sending"
            :disabled="countdown > 0"
            @click="handleSendCode"
          >
            {{ countdown > 0 ? t('login.resendIn', { count: countdown }) : t('login.sendCode') }}
          </el-button>
        </template>

        <template v-else>
          <el-form-item :label="t('login.codeLabel')">
            <el-input
              v-model.trim="code"
              :placeholder="t('login.codePlaceholder')"
              size="large"
              maxlength="6"
              inputmode="numeric"
              autocomplete="one-time-code"
              @keyup.enter="handleLogin"
            />
          </el-form-item>
          <el-button
            class="full-button"
            type="primary"
            size="large"
            :loading="verifying"
            @click="handleLogin"
          >
            {{ t('common.login') }}
          </el-button>
          <button class="back-button" type="button" @click="step = 1">{{ t('login.changeEmail') }}</button>
        </template>
      </el-form>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { sendCode, verifyCode } from '../api/auth'
import { useUserStore } from '../store/user'
import { useI18n } from '../utils/i18n'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()

const email = ref('')
const code = ref('')
const step = ref(1)
const sending = ref(false)
const verifying = ref(false)
const countdown = ref(0)
let timer = null

const normalizedEmail = computed(() => email.value.trim().toLowerCase())

function isSchoolEmail(value) {
  return /^[a-z0-9._%+-]+@(student\.)?xjtlu\.edu\.cn$/.test(value)
}

function startCountdown(seconds = 60) {
  countdown.value = seconds
  window.clearInterval(timer)
  timer = window.setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      window.clearInterval(timer)
      timer = null
    }
  }, 1000)
}

async function handleSendCode() {
  if (!isSchoolEmail(normalizedEmail.value)) {
    ElMessage.error(t('login.schoolEmailRequired'))
    return
  }

  sending.value = true
  try {
    await sendCode(normalizedEmail.value)
    ElMessage.success(t('login.codeSent'))
    step.value = 2
    startCountdown(60)
  } finally {
    sending.value = false
  }
}

async function handleLogin() {
  if (!/^\d{6}$/.test(code.value)) {
    ElMessage.error(t('login.codeRequired'))
    return
  }

  verifying.value = true
  try {
    const result = await verifyCode(normalizedEmail.value, code.value)
    userStore.login(result.token, result.user)

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    if (redirect) {
      router.replace(redirect)
      return
    }
    router.replace(result.user?.campus ? '/' : '/profile/edit?force=1')
  } finally {
    verifying.value = false
  }
}

onBeforeUnmount(() => {
  window.clearInterval(timer)
})
</script>

<style scoped lang="scss">
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - var(--mobile-nav-height));
  padding: 32px 16px;
  background: #F5F3F7;
}

.login-card {
  width: min(400px, 100%);
  margin: 0;
  padding: 28px;
}

.login-head {
  margin-bottom: 24px;
  text-align: center;
}

.brand-orb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-bottom: 14px;
  border-radius: 14px;
  background: var(--gradient-brand);
  color: #fff;
  font-size: 24px;
  font-weight: 900;
}

.login-head h1 {
  margin: 0 0 8px;
  color: var(--color-dark);
  font-size: 26px;
}

.login-head p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 14px;
  line-height: 1.6;
}

.full-button {
  width: 100%;
}

.back-button {
  display: block;
  margin: 14px auto 0;
  border: 0;
  background: transparent;
  color: var(--color-primary);
  cursor: pointer;
}
</style>
