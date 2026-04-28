<template>
  <section class="publish-page mobile-page">
    <div class="mobile-content">
      <section class="publish-section mobile-card">
        <div class="section-header">
          <div class="field-label">
            <img class="field-icon" :src="iconCamera" alt="">
            <span class="label">{{ t('publish.images') }}</span>
          </div>
          <span class="sub-label">{{ form.images.length }}/9</span>
        </div>
        <ImageUploader v-model="form.images" folder="products" />
        <p class="image-tip">{{ t('publish.imageTip') }}</p>
      </section>

      <section class="publish-section mobile-card">
        <div class="input-group border-bottom">
          <div class="field-label">
            <img class="field-icon" :src="iconTitle" alt="">
            <span class="label">{{ t('publish.title') }}</span>
          </div>
          <input
            v-model.trim="form.title"
            class="input-field"
            maxlength="100"
            :placeholder="t('publish.titlePlaceholder')"
          >
        </div>

        <div class="input-group border-bottom">
          <div class="field-label">
            <img class="field-icon" :src="iconDescription" alt="">
            <span class="label">{{ t('publish.description') }}</span>
          </div>
          <textarea
            v-model.trim="form.description"
            class="textarea-field"
            maxlength="2000"
            :placeholder="t('publish.descriptionPlaceholder')"
          />
        </div>

        <div class="input-group border-bottom">
          <div class="field-label">
            <img class="field-icon" :src="iconPrice" alt="">
            <span class="label">{{ t('publish.price') }}</span>
          </div>
          <label class="price-input-wrap">
            <span class="yen-sign">¥</span>
            <input
              v-model="form.price"
              class="input-field price-input"
              inputmode="decimal"
              min="0"
              :placeholder="t('publish.pricePlaceholder')"
              step="0.01"
              type="number"
            >
          </label>
        </div>

        <div class="input-group border-bottom">
          <div class="field-label">
            <img class="field-icon" :src="iconCategory" alt="">
            <span class="label">{{ t('publish.category') }}</span>
          </div>
          <div class="category-list">
            <button
              v-for="category in categories"
              :key="category.id"
              class="category-chip"
              :class="{ active: form.category === category.value }"
              type="button"
              @click="form.category = category.value"
            >
              {{ category.label }}
            </button>
          </div>
        </div>

        <div class="input-group">
          <div class="field-label">
            <img class="field-icon" :src="iconLocation" alt="">
            <span class="label">{{ t('publish.location') }}</span>
          </div>
          <div class="campus-selector">
            <button
              v-for="campus in campuses"
              :key="campus.value"
              class="campus-option"
              :class="{ active: form.campus === campus.value }"
              type="button"
              @click="form.campus = campus.value"
            >
              <span class="campus-short">{{ campus.value.toUpperCase() }}</span>
              <span class="campus-info">
                <span class="campus-name">{{ campus.label }}</span>
                <span class="campus-location">{{ campus.location }}</span>
              </span>
            </button>
          </div>
        </div>
      </section>

      <p class="terms-text">{{ t('publish.terms') }}</p>
      <div class="bottom-placeholder"></div>
    </div>

    <div class="mobile-fixed-bottom">
      <button
        class="mobile-primary-btn publish-btn"
        type="button"
        :disabled="submitting"
        @click="handleSubmit"
      >
        {{ submitting ? t('publish.submitting') : t('publish.submit') }}
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import ImageUploader from '../components/ImageUploader.vue'
import { createProduct } from '../api/products'
import { useUserStore } from '../store/user'
import { getLocalizedCampusOptions, getLocalizedCategories } from '../utils/format'
import { useI18n } from '../utils/i18n'
import iconCamera from '../assets/mobile/icon-camera-v2.png'
import iconCategory from '../assets/mobile/icon-category-v2.png'
import iconDescription from '../assets/mobile/icon-description-v2.png'
import iconLocation from '../assets/mobile/icon-location-v2.png'
import iconPrice from '../assets/mobile/icon-price-v2.png'
import iconTitle from '../assets/mobile/icon-title-v2.png'

const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()
const submitting = ref(false)
const categories = computed(() => getLocalizedCategories(t))
const campuses = computed(() => getLocalizedCampusOptions(t))

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
    ElMessage.error(t('publish.titleRequired'))
    return false
  }
  if (form.price === '' || Number.isNaN(price) || price < 0) {
    ElMessage.error(t('publish.priceRequired'))
    return false
  }
  if (!form.category) {
    ElMessage.error(t('publish.categoryRequired'))
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
    ElMessage.success(t('publish.success'))
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
