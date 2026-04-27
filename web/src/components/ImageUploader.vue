<template>
  <div class="image-uploader">
    <div class="thumb-list">
      <div
        v-for="(url, index) in imageList"
        :key="url"
        class="thumb-item"
      >
        <img :src="url" alt="已上传图片" loading="lazy">
        <button
          class="remove-button"
          type="button"
          aria-label="删除图片"
          @click="removeImage(index)"
        >
          ×
        </button>
      </div>

      <el-upload
        v-if="imageList.length < maxCount"
        class="upload-card"
        accept="image/*"
        :show-file-list="false"
        :http-request="handleUpload"
        :disabled="uploading"
      >
        <div class="upload-inner">
          <span class="upload-plus">+</span>
          <span>{{ uploading ? '上传中' : '添加图片' }}</span>
        </div>
      </el-upload>
    </div>
  </div>
</template>

<script setup>
import axios from 'axios'
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getUploadSign } from '../api/upload'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  maxCount: {
    type: Number,
    default: 9
  },
  folder: {
    type: String,
    default: 'products'
  }
})

const emit = defineEmits(['update:modelValue'])

const uploadConfig = ref({
  cloudName: '',
  uploadPreset: '',
  folder: props.folder
})
const uploading = ref(false)
const warnedMissingConfig = ref(false)

const imageList = computed(() => {
  return Array.isArray(props.modelValue) ? props.modelValue : []
})

function warnMissingConfig() {
  if (warnedMissingConfig.value) return
  warnedMissingConfig.value = true
  ElMessage.warning('图片上传未配置（请联系管理员配置 Cloudinary）')
}

async function loadUploadSign() {
  try {
    const sign = await getUploadSign({ folder: props.folder })
    uploadConfig.value = {
      cloudName: sign?.cloudName || '',
      uploadPreset: sign?.uploadPreset || '',
      folder: sign?.folder || props.folder
    }

    if (!uploadConfig.value.cloudName || !uploadConfig.value.uploadPreset) {
      warnMissingConfig()
    }
  } catch (error) {
    uploadConfig.value = {
      cloudName: '',
      uploadPreset: '',
      folder: props.folder
    }
  }
}

function removeImage(index) {
  const nextList = imageList.value.filter((_, currentIndex) => currentIndex !== index)
  emit('update:modelValue', nextList)
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
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', uploadPreset)
    formData.append('folder', `xloop/${folder || props.folder}`)

    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      formData
    )
    const url = response.data?.secure_url
    if (!url) {
      throw new Error('Upload response missing secure_url')
    }

    emit('update:modelValue', [...imageList.value, url])
    onSuccess?.(response.data)
  } catch (error) {
    ElMessage.error('图片上传失败，请稍后重试')
    onError?.(error)
  } finally {
    uploading.value = false
  }
}

onMounted(loadUploadSign)
</script>

<style scoped lang="scss">
.thumb-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.thumb-item,
.upload-card {
  width: 96px;
  height: 96px;
  border-radius: 8px;
}

.thumb-item {
  position: relative;
  overflow: hidden;
  background: var(--color-tag-bg);
}

.thumb-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-button {
  position: absolute;
  top: 5px;
  right: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 50%;
  background: rgba(1, 5, 68, 0.68);
  color: #fff;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}

.upload-card :deep(.el-upload) {
  width: 96px;
  height: 96px;
}

.upload-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
  border: 1px dashed var(--color-primary);
  border-radius: 8px;
  background: #fff;
  color: var(--color-primary);
  cursor: pointer;
  gap: 6px;
}

.upload-plus {
  font-size: 28px;
  font-weight: 300;
  line-height: 1;
}
</style>
