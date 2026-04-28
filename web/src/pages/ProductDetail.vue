<template>
  <section class="detail-page">
    <el-skeleton
      v-if="loading"
      class="detail-skeleton"
      :rows="8"
      animated
    />

    <EmptyState
      v-else-if="!product"
      :text="t('productDetail.notFound')"
    />

    <template v-else>
      <div class="swiper-wrap">
        <el-carousel
          v-if="imageList.length"
          class="image-carousel"
          :autoplay="true"
          :interval="4000"
          indicator-position="none"
          arrow="hover"
          @change="onSlideChange"
        >
          <el-carousel-item
            v-for="(image, index) in imageList"
            :key="image"
          >
            <img
              class="detail-image"
              :src="image"
              :alt="`${product.title || t('common.productImage')} ${index + 1}`"
              loading="lazy"
              @click="openViewer(index)"
            >
          </el-carousel-item>
        </el-carousel>
        <div v-else class="image-placeholder">X-Loop</div>
        <div v-if="imageList.length > 1" class="swiper-indicator">
          {{ currentImageIndex + 1 }} / {{ imageList.length }}
        </div>
      </div>

      <div class="product-info-card">
        <h1 class="product-title">{{ product.title || t('common.unnamedProduct') }}</h1>

        <div class="product-tags">
          <span class="tag-pill">{{ categoryLabel }}</span>
          <span class="tag-pill tag-status">{{ statusText }}</span>
        </div>

        <div class="price-row">
          <span class="price-value">{{ formatPrice(product.price) }}</span>
        </div>

        <div class="desc-section">
          <span class="desc-label">{{ t('productDetail.description') }}</span>
          <p class="desc-text">{{ product.description || t('productDetail.noDescription') }}</p>
        </div>

        <div class="info-grid">
          <div class="info-grid-item">
            <span class="info-grid-label">{{ t('productDetail.tradeMethod') }}</span>
            <span class="info-grid-value">{{ t('productDetail.offlineTrade') }}</span>
          </div>
          <div class="info-grid-item">
            <span class="info-grid-label">{{ t('productDetail.location') }}</span>
            <span class="info-grid-value">{{ campusLabel }}</span>
          </div>
          <div class="info-grid-item">
            <span class="info-grid-label">{{ t('productDetail.publishTime') }}</span>
            <span class="info-grid-value">{{ formatTime(product.createdAt || product.createTime, t) }}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        class="seller-card"
        :disabled="!sellerId"
        @click="goReviews"
      >
        <div class="seller-header">
          <el-avatar class="seller-avatar" :size="48" :src="seller.avatarUrl">
            {{ sellerName.slice(0, 1).toUpperCase() }}
          </el-avatar>
          <div class="seller-info">
            <span class="seller-name">{{ sellerName }}</span>
            <span class="seller-school">{{ t('productDetail.sellerSchool') }}</span>
          </div>
          <span class="seller-link">{{ t('productDetail.viewReviews') }}</span>
        </div>
        <div class="seller-stats">
          <div class="stat-item">
            <span class="stat-num">{{ seller.credit ?? 100 }}</span>
            <span class="stat-label">{{ t('productDetail.credit') }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-num">{{ campusLabel }}</span>
            <span class="stat-label">{{ t('productDetail.campus') }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-num">{{ statusText }}</span>
            <span class="stat-label">{{ t('productDetail.status') }}</span>
          </div>
        </div>
      </button>

      <ElImageViewer
        v-if="viewerVisible"
        :url-list="imageList"
        :initial-index="viewerIndex"
        @close="viewerVisible = false"
      />

      <div class="bottom-action-bar">
        <template v-if="isSeller">
          <button
            class="btn-want"
            type="button"
            @click="router.push('/my-products')"
          >
            {{ t('productDetail.manageMine') }}
          </button>
        </template>

        <template v-else>
          <button
            class="btn-chat"
            type="button"
            @click="handleContact"
          >
            {{ t('productDetail.chat') }}
          </button>
        </template>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElImageViewer } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '../components/EmptyState.vue'
import { getProductById as getProduct } from '../api/products'
import { useUserStore } from '../store/user'
import { formatPrice, formatTime, getCampusLabel, getCategoryName, getProductStatusText } from '../utils/format'
import { useI18n } from '../utils/i18n'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()

const product = ref(null)
const loading = ref(true)
const viewerVisible = ref(false)
const viewerIndex = ref(0)
const currentImageIndex = ref(0)

const productId = computed(() => String(route.params.id || ''))
const imageList = computed(() => {
  return Array.isArray(product.value?.images) ? product.value.images : []
})
const seller = computed(() => product.value?.seller || {})
const sellerId = computed(() => seller.value.id || product.value?.sellerId || '')
const sellerName = computed(() => seller.value.nickName || t('common.userFallback'))
const currentUserId = computed(() => userStore.user?.id || userStore.user?._id || '')
const isSeller = computed(() => {
  return Boolean(userStore.isLoggedIn && currentUserId.value && sellerId.value && currentUserId.value === sellerId.value)
})
const categoryLabel = computed(() => {
  return getCategoryName(product.value?.category || '', t)
})
const campusLabel = computed(() => {
  return getCampusLabel(product.value?.campus, t)
})
const statusText = computed(() => getProductStatusText(product.value?.status, t) || t('status.product.unavailable'))

async function loadProduct() {
  loading.value = true
  try {
    product.value = await getProduct(productId.value)
  } catch (error) {
    product.value = null
  } finally {
    loading.value = false
  }
}

function onSlideChange(index) {
  currentImageIndex.value = index
}

function openViewer(index) {
  viewerIndex.value = index
  viewerVisible.value = true
}

function goLogin() {
  router.push({
    path: '/login',
    query: { redirect: route.fullPath }
  })
}

function handleContact() {
  if (!userStore.isLoggedIn) {
    goLogin()
    return
  }
  if (!sellerId.value) return
  router.push({
    path: `/chat/${sellerId.value}`,
    query: { productId: product.value?.id || productId.value }
  })
}

function goReviews() {
  if (!sellerId.value) return
  router.push(`/reviews/${sellerId.value}`)
}

onMounted(loadProduct)
</script>

<style scoped lang="scss">
.detail-page {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 0 0 96px;
  background: #f5f3f7;
}

.detail-skeleton {
  margin: 16px;
  padding: 18px;
  border-radius: 12px;
  background: #fff;
}

.swiper-wrap {
  position: relative;
  width: 100%;
}

.image-carousel {
  width: 100%;
  aspect-ratio: 1 / 1;
}

.image-carousel :deep(.el-carousel__container) {
  height: 100%;
}

.detail-image {
  width: 100%;
  height: 100%;
  cursor: zoom-in;
  object-fit: cover;
}

.image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #F0E6F6;
  color: #010544;
  font-size: 28px;
  font-weight: 800;
}

.swiper-indicator {
  position: absolute;
  right: 16px;
  bottom: 28px;
  padding: 3px 12px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 12px;
}

.product-info-card {
  position: relative;
  z-index: 2;
  margin-top: -16px;
  padding: 20px 16px 16px;
  border-radius: 16px 16px 0 0;
  background: #fff;
}

.product-title {
  margin: 0 0 12px;
  color: #1b1b1e;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.5;
}

.product-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.tag-pill {
  padding: 4px 12px;
  border-radius: 10px;
  background: #F0E6F6;
  color: #CE57C1;
  font-size: 12px;
}

.tag-pill.tag-status {
  background: #eeedf0;
  color: #464650;
}

.price-row {
  display: flex;
  align-items: baseline;
  margin-bottom: 18px;
}

.price-value {
  color: #FF4D4F;
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
}

.desc-section {
  margin-bottom: 18px;
}

.desc-label {
  display: block;
  margin-bottom: 6px;
  color: #1b1b1e;
  font-size: 14px;
  font-weight: 600;
}

.desc-text {
  margin: 0;
  color: #464650;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.info-grid-item {
  display: flex;
  flex-direction: column;
  padding: 12px;
  border-radius: 10px;
  background: #F0E6F6;
}

.info-grid-label {
  margin-bottom: 4px;
  color: #777681;
  font-size: 11px;
}

.info-grid-value {
  overflow: hidden;
  color: #1b1b1e;
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.seller-card {
  display: block;
  width: 100%;
  margin: 10px 0 0;
  padding: 18px 16px;
  border: 0;
  background: #fff;
  cursor: pointer;
  text-align: left;
}

.seller-card:disabled {
  cursor: default;
}

.seller-header {
  display: flex;
  align-items: center;
  margin-bottom: 14px;
}

.seller-avatar {
  flex: 0 0 auto;
  margin-right: 12px;
  border: 2px solid #F0E6F6;
}

.seller-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.seller-name {
  margin-bottom: 2px;
  color: #1b1b1e;
  font-size: 16px;
  font-weight: 700;
}

.seller-school {
  color: #777681;
  font-size: 12px;
}

.seller-link {
  color: #777681;
  font-size: 13px;
}

.seller-stats {
  display: flex;
  padding: 12px 0;
  border-radius: 10px;
  background: #f5f3f7;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  margin-bottom: 2px;
  color: #1b1b1e;
  font-size: 17px;
  font-weight: 700;
}

.stat-label {
  color: #777681;
  font-size: 12px;
}

.bottom-action-bar {
  position: fixed;
  right: max(0px, calc((100vw - 720px) / 2));
  bottom: 0;
  left: max(0px, calc((100vw - 720px) / 2));
  z-index: 40;
  display: flex;
  gap: 8px;
  padding: 8px 12px calc(8px + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.06);
}

.btn-chat,
.btn-want {
  flex: 1;
  height: 40px;
  border: 0;
  border-radius: 20px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.btn-chat {
  background: linear-gradient(to right, #010544, #CE57C1);
  color: #fff;
}

.btn-want {
  background: linear-gradient(to right, #010544, #CE57C1);
  color: #fff;
}

.btn-want:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status-hint {
  flex: 1;
  align-self: center;
  padding: 0 16px;
  color: #777681;
  font-size: 13px;
  text-align: center;
}

@media (min-width: 768px) {
  .detail-page {
    max-width: 720px;
    padding: 24px 16px 96px;
    background: transparent;
  }

  .swiper-wrap,
  .product-info-card,
  .seller-card {
    border-radius: 12px;
    overflow: hidden;
  }

  .swiper-wrap {
    margin-bottom: 14px;
  }

  .image-carousel,
  .image-placeholder {
    aspect-ratio: 16 / 10;
  }

  .product-info-card {
    margin-top: 0;
  }

  .seller-card {
    margin-top: 14px;
  }

  .bottom-action-bar {
    position: sticky;
    margin-top: 14px;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(1, 5, 68, 0.06);
  }
}
</style>
