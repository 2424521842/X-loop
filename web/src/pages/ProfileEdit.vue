<template>
  <section class="profile-edit-page">
    <div class="profile-card card">
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

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent
      >
        <el-form-item label="昵称" prop="nickName">
          <el-input v-model.trim="form.nickName" placeholder="请输入昵称" size="large" />
        </el-form-item>

        <el-form-item label="头像 URL" prop="avatarUrl">
          <el-input v-model.trim="form.avatarUrl" placeholder="Phase 4 接入 Cloudinary 上传" size="large" />
        </el-form-item>

        <el-form-item label="校区" prop="campus">
          <el-select v-model="form.campus" class="full-width" placeholder="请选择校区" size="large">
            <el-option
              v-for="campus in CAMPUS_OPTIONS"
              :key="campus.value"
              :label="campus.label"
              :value="campus.value"
            />
          </el-select>
        </el-form-item>

        <el-button
          class="full-width"
          type="primary"
          size="large"
          :loading="saving"
          @click="handleSave"
        >
          保存
        </el-button>
      </el-form>
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

const formRef = ref(null)
const saving = ref(false)
const form = reactive({
  nickName: '',
  avatarUrl: '',
  campus: ''
})

const rules = {
  nickName: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  campus: [{ required: true, message: '请选择校区', trigger: 'change' }]
}

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
  await formRef.value.validate()

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
  padding: 40px 16px;
}

.profile-card {
  width: min(520px, 100%);
  margin: 0;
  padding: 28px;
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
</style>
