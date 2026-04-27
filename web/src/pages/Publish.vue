<template>
  <section class="publish-page mobile-page">
    <div class="mobile-content">
      <section class="publish-section mobile-card">
        <div class="section-header">
          <div class="field-label">
            <img class="field-icon" :src="iconCamera" alt="">
            <span class="label">商品图片</span>
          </div>
          <span class="sub-label">{{ form.images.length }}/9</span>
        </div>
        <ImageUploader v-model="form.images" folder="products" />
        <p class="image-tip">最多可上传9张照片</p>
      </section>

      <section class="publish-section mobile-card">
        <div class="input-group border-bottom">
          <div class="field-label">
            <img class="field-icon" :src="iconTitle" alt="">
            <span class="label">标题</span>
          </div>
          <input
            v-model.trim="form.title"
            class="input-field"
            maxlength="100"
            placeholder="给你的宝贝起个名字..."
          >
        </div>

        <div class="input-group border-bottom">
          <div class="field-label">
            <img class="field-icon" :src="iconDescription" alt="">
            <span class="label">描述</span>
          </div>
          <textarea
            v-model.trim="form.description"
            class="textarea-field"
            maxlength="2000"
            placeholder="描述一下宝贝的品牌、型号、新旧程度、入手渠道等..."
          />
        </div>

        <div class="input-group border-bottom">
          <div class="field-label">
            <img class="field-icon" :src="iconPrice" alt="">
            <span class="label">价格</span>
          </div>
          <label class="price-input-wrap">
            <span class="yen-sign">¥</span>
            <input
              v-model="form.price"
              class="input-field price-input"
              inputmode="decimal"
              min="0"
              placeholder="输入价格"
              step="0.01"
              type="number"
            >
          </label>
        </div>

        <div class="input-group border-bottom">
          <div class="field-label">
            <img class="field-icon" :src="iconCategory" alt="">
            <span class="label">选择分类</span>
          </div>
          <div class="category-list">
            <button
              v-for="category in CATEGORIES"
              :key="category.id"
              class="category-chip"
              :class="{ active: form.category === category.name }"
              type="button"
              @click="form.category = category.name"
            >
              {{ category.name }}
            </button>
          </div>
        </div>

        <div class="input-group">
          <div class="field-label">
            <img class="field-icon" :src="iconLocation" alt="">
            <span class="label">发布位置</span>
          </div>
          <div class="campus-selector">
            <button
              v-for="campus in CAMPUS_OPTIONS"
              :key="campus.value"
              class="campus-option"
              :class="{ active: form.campus === campus.value }"
              type="button"
              @click="form.campus = campus.value"
            >
              <span class="campus-short">{{ campus.value.toUpperCase() }}</span>
              <span class="campus-info">
                <span class="campus-name">{{ campus.label.replace(/ \(.+\)/, '') }}</span>
                <span class="campus-location">{{ campus.value === 'sip' ? '苏州独墅湖' : '太仓校区' }}</span>
              </span>
            </button>
          </div>
        </div>
      </section>

      <p class="terms-text">发布即表示同意 X-Loop 平台服务条款，请确保商品信息真实有效</p>
      <div class="bottom-placeholder"></div>
    </div>

    <div class="mobile-fixed-bottom">
      <button
        class="mobile-primary-btn publish-btn"
        type="button"
        :disabled="submitting"
        @click="handleSubmit"
      >
        {{ submitting ? '发布中...' : '确认发布' }}
      </button>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import ImageUploader from '../components/ImageUploader.vue'
import { createProduct } from '../api/products'
import { useUserStore } from '../store/user'
import { CAMPUS_OPTIONS, CATEGORIES } from '../utils/format'
import iconCamera from '../assets/mobile/icon-camera-v2.png'
import iconCategory from '../assets/mobile/icon-category-v2.png'
import iconDescription from '../assets/mobile/icon-description-v2.png'
import iconLocation from '../assets/mobile/icon-location-v2.png'
import iconPrice from '../assets/mobile/icon-price-v2.png'
import iconTitle from '../assets/mobile/icon-title-v2.png'

const router = useRouter()
const userStore = useUserStore()
const submitting = ref(false)

const form = reactive({
  title: '',
  description: '',
  price: '',
  category: '',
  images: [],
  campus: ''
})

function validateForm() {
  const price = Number(form.price)
  if (!form.title.trim()) {
    ElMessage.error('请输入商品标题')
    return false
  }
  if (form.price === '' || Number.isNaN(price) || price < 0) {
    ElMessage.error('请输入正确的价格')
    return false
  }
  if (!form.category) {
    ElMessage.error('请选择分类')
    return false
  }
  return true
}

async function handleSubmit() {
  if (!validateForm()) return

  submitting.value = true
  try {
    await createProduct({
      title: form.title,
      description: form.description,
      price: Number(form.price),
      category: form.category,
      images: form.images,
      campus: form.campus || undefined
    })
    ElMessage.success('发布成功')
    router.push('/my-products')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  form.campus = userStore.user?.campus || ''
})
</script>

<style scoped lang="scss">
.publish-page {
  background: #F5F3F7;
}

.publish-section {
  padding: 18px;
  margin-bottom: 14px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.field-label {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 9px;
}

.field-icon {
  width: 21px;
  height: 21px;
  flex: 0 0 auto;
  object-fit: contain;
}

.label {
  color: #1b1b1e;
  font-size: 15px;
  font-weight: 700;
}

.sub-label,
.image-tip,
.terms-text {
  color: #777681;
  font-size: 12px;
}

.image-tip {
  margin: 10px 0 0;
}

.input-group {
  padding: 16px 0;
}

.input-group:first-child {
  padding-top: 0;
}

.input-group:last-child {
  padding-bottom: 0;
}

.border-bottom {
  border-bottom: 1px solid #f0eff2;
}

.input-field,
.textarea-field {
  width: 100%;
  margin-top: 12px;
  padding: 7px 0;
  border: 0;
  outline: none;
  background: transparent;
  color: #1b1b1e;
  font-size: 14px;
}

.textarea-field {
  min-height: 96px;
  resize: vertical;
  line-height: 1.6;
}

.input-field::placeholder,
.textarea-field::placeholder {
  color: #b3b1bc;
}

.price-input-wrap {
  display: flex;
  align-items: center;
  margin-top: 12px;
}

.yen-sign {
  margin-right: 5px;
  color: #FF4D4F;
  font-size: 20px;
  font-weight: 800;
}

.price-input {
  margin-top: 0;
}

.category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 12px;
}

.category-chip {
  min-height: 34px;
  padding: 0 15px;
  border: 1px solid transparent;
  border-radius: 17px;
  background: #f5f3f7;
  color: #464650;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}

.category-chip.active {
  border-color: #CE57C1;
  background: #F0E6F6;
  color: #010544;
}

.campus-selector {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin-top: 12px;
}

.campus-option {
  display: flex;
  align-items: center;
  min-width: 0;
  min-height: 58px;
  padding: 9px;
  border: 1px solid #eeedf0;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  text-align: left;
}

.campus-option.active {
  border-color: #CE57C1;
  background: #F0E6F6;
}

.campus-short {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  margin-right: 8px;
  border-radius: 8px;
  background: #f5f3f7;
  color: #010544;
  font-size: 12px;
  font-weight: 800;
  line-height: 30px;
  text-align: center;
}

.campus-option.active .campus-short {
  background: var(--gradient-brand);
  color: #fff;
}

.campus-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.campus-name {
  overflow: hidden;
  color: #1b1b1e;
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.campus-location {
  margin-top: 3px;
  color: #777681;
  font-size: 11px;
}

.terms-text {
  margin: 16px 20px 0;
  line-height: 1.6;
  text-align: center;
}

.bottom-placeholder {
  height: 76px;
}

.publish-btn {
  width: 100%;
}
</style>
