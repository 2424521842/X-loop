<template>
  <section class="profile-edit-page mobile-page">
    <div class="profile-card mobile-card">
      <el-alert
        v-if="isForce"
        class="force-alert"
        title="欢迎，请补完资料后再使用 X-Loop"
        type="info"
        :closable="false"
      />

      <div class="page-head">
        <h1>编辑资料</h1>
        <p>昵称、头像和校区会用于交易沟通与公开资料展示。</p>
      </div>

      <div class="form-stack">
        <label class="form-field">
          <span>昵称</span>
          <input v-model.trim="form.nickName" placeholder="请输入昵称">
        </label>

        <label class="form-field">
          <span>头像 URL</span>
          <input v-model.trim="form.avatarUrl" placeholder="Phase 4 接入 Cloudinary 上传">
        </label>

        <div class="form-field">
          <span>校区</span>
          <div class="campus-list">
            <button
              v-for="campus in CAMPUS_OPTIONS"
              :key="campus.value"
              class="campus-chip"
              :class="{ active: form.campus === campus.value }"
              type="button"
              @click="form.campus = campus.value"
            >
              {{ campus.label }}
            </button>
          </div>
        </div>

        <button
          class="mobile-primary-btn full-width"
          type="button"
          :disabled="saving"
          @click="handleSave"
        >
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { updateMe } from '../api/users'
import { useUserStore } from '../store/user'
import { CAMPUS_OPTIONS } from '../utils/format'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const saving = ref(false)
const form = reactive({
  nickName: '',
  avatarUrl: '',
  campus: ''
})

const isForce = computed(() => route.query.force === '1')

watch(
  () => userStore.user,
  (user) => {
    if (!user) return
    form.nickName = user.nickName || ''
    form.avatarUrl = user.avatarUrl || ''
    form.campus = user.campus || ''
  },
  { immediate: true }
)

async function handleSave() {
  if (!form.nickName.trim()) {
    ElMessage.error('请输入昵称')
    return
  }
  if (!form.campus) {
    ElMessage.error('请选择校区')
    return
  }

  saving.value = true
  try {
    const updatedUser = await updateMe({
      nickName: form.nickName,
      avatarUrl: form.avatarUrl,
      campus: form.campus
    })
    userStore.setUser(updatedUser)
    ElMessage.success('资料已保存')

    if (isForce.value) {
      router.replace('/')
    }
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.profile-edit-page {
  display: flex;
  justify-content: center;
  padding: 16px;
  background: #F5F3F7;
}

.profile-card {
  width: min(520px, 100%);
  margin: 0;
  padding: 20px;
}

.force-alert {
  margin-bottom: 20px;
}

.page-head {
  margin-bottom: 24px;
}

.page-head h1 {
  margin: 0 0 8px;
  color: var(--color-dark);
  font-size: 24px;
}

.page-head p {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.full-width {
  width: 100%;
}

.form-stack {
  display: grid;
  gap: 16px;
}

.form-field {
  display: grid;
  gap: 9px;
}

.form-field > span {
  color: #1b1b1e;
  font-size: 14px;
  font-weight: 700;
}

.form-field input {
  width: 100%;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid #eeedf0;
  border-radius: 14px;
  outline: none;
  background: #fff;
  color: #1b1b1e;
}

.campus-list {
  display: grid;
  gap: 10px;
}

.campus-chip {
  min-height: 44px;
  border: 1px solid #eeedf0;
  border-radius: 14px;
  background: #fff;
  color: #464650;
  cursor: pointer;
  font-weight: 700;
}

.campus-chip.active {
  border-color: #CE57C1;
  background: #F0E6F6;
  color: #010544;
}
</style>
