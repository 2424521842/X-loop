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
      text="商品不存在"
    />

    <template v-else>
      <div class="detail-layout">
        <div class="media-card card">
          <el-carousel
            v-if="imageList.length"
            class="image-carousel"
            indicator-position="outside"
            arrow="always"
          >
            <el-carousel-item
              v-for="(image, index) in imageList"
              :key="image"
            >
              <img
                class="detail-image"
                :src="image"
                :alt="`${product.title || '商品图片'} ${index + 1}`"
                loading="lazy"
                @click="openViewer(index)"
              >
            </el-carousel-item>
          </el-carousel>
          <div v-else class="image-placeholder">X-Loop</div>
        </div>

        <div class="info-panel">
          <div class="product-card card">
            <div class="title-row">
              <h1>{{ product.title || '未命名商品' }}</h1>
              <el-tag
                v-if="product.status && product.status !== 'on_sale'"
                :type="statusTagType"
                effect="light"
              >
                {{ statusText }}
              </el-tag>
            </div>

            <div class="detail-price">{{ formatPrice(product.price) }}</div>

            <div class="meta-line">
              <span class="tag tag-green">{{ categoryLabel }}</span>
              <span>{{ formatTime(product.createdAt || product.createTime) }}</span>
            </div>

            <p class="description">{{ product.description || '卖家暂未填写商品描述。' }}</p>
          </div>

          <button class="seller-card card" type="button" @click="goReviews">
            <el-avatar :size="48" :src="seller.avatarUrl">
              {{ sellerName.slice(0, 1).toUpperCase() }}
            </el-avatar>
            <div class="seller-info">
              <div class="seller-name">{{ sellerName }}</div>
              <div class="seller-meta">信誉分 {{ seller.credit ?? 100 }}</div>
            </div>
            <span class="seller-link">查看评价 &gt;</span>
          </button>

          <div class="action-bar">
            <template v-if="isSeller">
              <el-button
                class="action-button"
                type="primary"
                size="large"
                @click="router.push('/my-products')"
              >
                管理我的商品
              </el-button>
            </template>

            <template v-else-if="product.status !== 'on_sale'">
              <span class="status-hint">{{ statusText }}，暂不可交易</span>
              <el-button class="action-button" size="large" disabled>联系卖家</el-button>
              <el-button class="action-button" type="primary" size="large" disabled>我要买</el-button>
            </template>

            <template v-else>
              <el-button
                class="action-button"
                size="large"
                @click="handleContact"
              >
                联系卖家
              </el-button>
              <el-button
                class="action-button"
                type="primary"
                size="large"
                :loading="ordering"
                @click="handleBuy"
              >
                我要买
              </el-button>
            </template>
          </div>
        </div>
      </div>

      <ElImageViewer
        v-if="viewerVisible"
        :url-list="imageList"
        :initial-index="viewerIndex"
        @close="viewerVisible = false"
      />
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElImageViewer, ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '../components/EmptyState.vue'
import { createOrder } from '../api/orders'
import { getProductById as getProduct } from '../api/products'
import { useUserStore } from '../store/user'
import { CATEGORIES, PRODUCT_STATUS_MAP, formatPrice, formatTime } from '../utils/format'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const product = ref(null)
const loading = ref(true)
const ordering = ref(false)
const viewerVisible = ref(false)
const viewerIndex = ref(0)

const productId = computed(() => String(route.params.id || ''))
const imageList = computed(() => {
  return Array.isArray(product.value?.images) ? product.value.images : []
})
const seller = computed(() => product.value?.seller || {})
const sellerId = computed(() => seller.value.id || product.value?.sellerId || '')
const sellerName = computed(() => seller.value.nickName || 'X-Loop 用户')
const currentUserId = computed(() => userStore.user?.id || userStore.user?._id || '')
const isSeller = computed(() => {
  return Boolean(userStore.isLoggedIn && currentUserId.value && sellerId.value && currentUserId.value === sellerId.value)
})
const categoryLabel = computed(() => {
  const category = product.value?.category || '其他'
  const match = CATEGORIES.find((item) => item.id === category || item.name === category)
  return match?.name || category
})
const statusText = computed(() => PRODUCT_STATUS_MAP[product.value?.status] || '不可交易')
const statusTagType = computed(() => {
  if (product.value?.status === 'reserved') return 'warning'
  return 'info'
})

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

async function handleBuy() {
  if (!userStore.isLoggedIn) {
    goLogin()
    return
  }

  ordering.value = true
  try {
    await createOrder({ productId: productId.value })
    ElMessage.success('下单成功')
    router.push('/orders')
  } finally {
    ordering.value = false
  }
}

function goReviews() {
  if (!sellerId.value) return
  router.push(`/reviews/${sellerId.value}`)
}

onMounted(loadProduct)
</script>

<style scoped lang="scss">
.detail-page {
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 24px 16px 104px;
}

.detail-skeleton {
  padding: 18px;
  border-radius: 8px;
  background: #fff;
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 18px;
  align-items: start;
}

.media-card,
.product-card {
  margin: 0;
}

.image-carousel {
  aspect-ratio: 16 / 9;
}

.image-carousel :deep(.el-carousel__container) {
  height: 100%;
}

.detail-image,
.image-placeholder {
  width: 100%;
  height: 100%;
}

.detail-image {
  cursor: zoom-in;
  object-fit: cover;
}

.image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  background: var(--color-tag-bg);
  color: var(--color-primary);
  font-size: 28px;
  font-weight: 800;
}

.info-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

h1 {
  margin: 0;
  color: var(--color-dark);
  font-size: 24px;
  line-height: 1.35;
}

.detail-price {
  margin: 16px 0 12px;
  color: var(--color-price);
  font-size: 28px;
  font-weight: 800;
}

.meta-line {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.description {
  margin: 18px 0 0;
  color: var(--color-text);
  line-height: 1.8;
  white-space: pre-wrap;
}

.seller-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  border: 0;
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
}

.seller-card:hover {
  background: var(--color-tag-bg);
}

.seller-info {
  min-width: 0;
  flex: 1;
}

.seller-name {
  margin-bottom: 4px;
  font-weight: 800;
}

.seller-meta,
.seller-link {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 2px;
}

.action-button {
  flex: 1;
}

.status-hint {
  flex: 1 0 100%;
  color: var(--color-text-secondary);
  font-size: 13px;
}

@media (max-width: 767px) {
  .detail-layout {
    display: block;
  }

  .info-panel {
    margin-top: 14px;
  }

  .action-bar {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 40;
    flex-wrap: wrap;
    padding: 10px 14px calc(10px + env(safe-area-inset-bottom));
    background: #fff;
    box-shadow: 0 -6px 18px rgba(1, 5, 68, 0.08);
  }
}

@media (min-width: 768px) {
  .detail-page {
    padding-bottom: 40px;
  }
}
</style>
