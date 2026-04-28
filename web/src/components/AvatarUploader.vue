<template>
  <div class="avatar-uploader">
    <div class="avatar-preview">
      <img
        v-if="modelValue"
        :src="modelValue"
        :alt="t('profileEdit.avatarPreviewAlt')"
        loading="lazy"
      >
      <span v-else class="avatar-placeholder">{{ t('profileEdit.avatarPlaceholderText') }}</span>
    </div>

    <div class="avatar-actions">
      <el-upload
        accept="image/*"
        :show-file-list="false"
        :http-request="handleUpload"
        :disabled="uploading"
      >
        <button class="avatar-action avatar-action-primary" type="button" :disabled="uploading">
          {{ uploadButtonText }}
        </button>
      </el-upload>

      <button
        v-if="modelValue"
        class="avatar-action avatar-action-secondary"
        type="button"
        :disabled="uploading"
        @click="removeAvatar"
      >
        {{ t('profileEdit.avatarRemove') }}
      </button>
    </div>

    <p class="avatar-tip">{{ t('profileEdit.avatarTip') }}</p>
  </div>
</template>

<script setup>
import axios from 'axios'
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getUploadSign } from '../api/upload'
import { useI18n } from '../utils/i18n'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'uploading-change'])
const { t } = useI18n()

const uploadConfig = ref({
  cloudName: '',
  uploadPreset: '',
  folder: 'avatars'
})
const uploading = ref(false)
const warnedMissingConfig = ref(false)

const uploadButtonText = computed(() => {
  if (uploading.value) return t('imageUploader.uploading')
  return props.modelValue ? t('profileEdit.avatarChange') : t('profileEdit.avatarUpload')
})

function warnMissingConfig() {
  if (warnedMissingConfig.value) return
  warnedMissingConfig.value = true
  ElMessage.warning(t('imageUploader.missingConfig'))
}

async function loadUploadSign() {
  try {
    const sign = await getUploadSign({ folder: 'avatars' })
    uploadConfig.value = {
      cloudName: sign?.cloudName || '',
      uploadPreset: sign?.uploadPreset || '',
      folder: sign?.folder || 'avatars'
    }

    if (!uploadConfig.value.cloudName || !uploadConfig.value.uploadPreset) {
      warnMissingConfig()
    }
  } catch (error) {
    uploadConfig.value = {
      cloudName: '',
      uploadPreset: '',
      folder: 'avatars'
    }
  }
}

function removeAvatar() {
  emit('update:modelValue', '')
}

async function handleUpload(options) {
  const { file, onSuccess, onError } = options
  const { cloudName, uploadPreset, folder } = uploadConfig.value

  if (!cloudName || !uploadPreset) {
    warnMissingConfig()
    onError?.(new Error('Cloudinary is not configured'))
    return
  }

  uploading.value = true
  emit('uploading-change', true)
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', uploadPreset)
    formData.append('folder', `xloop/${folder}`)

    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      formData
    )
    const avatarUrl = response.data?.secure_url
    if (!avatarUrl) {
      throw new Error('Upload response missing secure_url')
    }

    emit('update:modelValue', avatarUrl)
    onSuccess?.(response.data)
  } catch (error) {
    ElMessage.error(t('imageUploader.uploadFailed'))
    onError?.(error)
  } finally {
    uploading.value = false
    emit('uploading-change', false)
  }
}

onMounted(loadUploadSign)
</script>

<style scoped lang="scss">
.avatar-uploader {
  display: grid;
  justify-items: center;
  gap: 12px;
}

.avatar-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 104px;
  height: 104px;
  overflow: hidden;
  border: 3px solid #fff;
  border-radius: 50%;
  background: linear-gradient(135deg, #010544, #CE57C1);
  box-shadow: 0 8px 26px rgba(1, 5, 68, 0.16);
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  color: #fff;
  font-size: 26px;
  font-weight: 800;
}

.avatar-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.avatar-action {
  min-height: 36px;
  padding: 0 18px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
}

.avatar-action:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.avatar-action-primary {
  border: 0;
  background: var(--gradient-brand);
  color: #fff;
}

.avatar-action-secondary {
  border: 1px solid #eeedf0;
  background: #fff;
  color: #777681;
}

.avatar-tip {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.5;
  text-align: center;
}
</style>
