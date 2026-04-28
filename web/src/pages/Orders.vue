<template>
  <section class="orders-page mobile-page">
    <div class="role-tabs">
      <button
        class="role-tab"
        :class="{ active: activeRole === 'buyer' }"
        type="button"
        @click="activeRole = 'buyer'"
      >
        {{ t('orders.bought') }}
      </button>
      <button
        class="role-tab"
        :class="{ active: activeRole === 'seller' }"
        type="button"
        @click="activeRole = 'seller'"
      >
        {{ t('orders.sold') }}
      </button>
    </div>

    <div class="status-tabs">
      <button
        v-for="item in statusFilters"
        :key="item.value"
        class="status-tab"
        :class="{ active: activeStatus === item.value }"
        type="button"
        @click="activeStatus = item.value"
      >
        {{ item.label }}
      </button>
    </div>

    <div class="mobile-content">
      <el-skeleton
        v-if="loading"
        class="orders-skeleton"
        :rows="6"
        animated
      />

      <EmptyState
        v-else-if="orders.length === 0"
        :text="t('orders.empty')"
      />

      <div v-else class="order-list">
        <article
          v-for="order in orders"
          :key="order.id || order._id"
          class="order-card"
        >
          <div class="order-header">
            <span class="order-status" :class="`status-${order.status}`">
              {{ statusText(order) }}
            </span>
            <span class="order-time">{{ formatTime(order.createdAt, t) }}</span>
          </div>

          <button class="order-product" type="button" @click="goProduct(order)">
            <span class="product-thumb">
              <img
                v-if="getProductImage(order)"
                :src="getProductImage(order)"
                :alt="getProductTitle(order)"
                loading="lazy"
              >
              <span v-else>X</span>
            </span>
            <span class="order-product-info">
              <span class="product-title">{{ getProductTitle(order) }}</span>
              <span class="order-price">{{ formatPrice(order.price || order.product?.price) }}</span>
              <span class="order-user">{{ activeRole === 'buyer' ? t('orders.seller') : t('orders.buyer') }}: {{ order.counterpart?.nickName || t('common.userFallback') }}</span>
            </span>
          </button>

          <div class="order-actions">
            <button
              v-if="canCancel(order)"
              type="button"
              @click="handleStatusAction(order, 'cancelled', t('orders.cancelSuccess'))"
            >
              {{ t('orders.cancelInvite') }}
            </button>

            <template v-if="canSellerHandlePending(order)">
              <button
                class="primary"
                type="button"
                @click="handleStatusAction(order, 'confirmed', t('orders.acceptSuccess'))"
              >
                {{ t('orders.acceptReserve') }}
              </button>
              <button
                type="button"
                @click="handleStatusAction(order, 'cancelled', t('orders.rejectSuccess'))"
              >
                {{ t('orders.reject') }}
              </button>
            </template>

            <button
              v-if="canComplete(order)"
              class="primary"
              type="button"
              @click="handleStatusAction(order, 'completed', t('orders.completeSuccess'))"
            >
              {{ t('orders.complete') }}
            </button>

            <button
              v-if="canReviewBuyerSide(order)"
              class="primary"
              type="button"
              @click="goReview(order, order.sellerId)"
            >
              {{ t('orders.reviewSeller') }}
            </button>

            <button
              v-if="canReviewSellerSide(order)"
              class="primary"
              type="button"
              @click="goReview(order, order.buyerId)"
            >
              {{ t('orders.reviewBuyer') }}
            </button>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import EmptyState from '../components/EmptyState.vue'
import { getOrders, updateOrder } from '../api/orders'
import { formatTime, getOrderStatusText } from '../utils/format'
import { useI18n } from '../utils/i18n'

const router = useRouter()
const { t } = useI18n()

const orders = ref([])
const loading = ref(false)
const actingId = ref('')
const activeRole = ref('buyer')
const activeStatus = ref('all')
const page = ref(1)
const pageSize = 50

const statusFilters = computed(() => [
  { label: t('status.order.all'), value: 'all' },
  { label: getOrderStatusText('pending', t), value: 'pending' },
  { label: getOrderStatusText('confirmed', t), value: 'confirmed' },
  { label: getOrderStatusText('completed', t), value: 'completed' },
  { label: getOrderStatusText('cancelled', t), value: 'cancelled' }
])

function getOrderId(order) {
  return order?.id || order?._id || ''
}

function getProduct(order) {
  return order?.product || {}
}

function getProductId(order) {
  return getProduct(order).id || order?.productId || ''
}

function getProductTitle(order) {
  return getProduct(order).title || order?.snapshot?.title || t('common.unnamedProduct')
}

function getProductImage(order) {
  return getProduct(order).image || order?.snapshot?.image || ''
}

function statusText(order) {
  if (order?.status === 'cancelled') {
    if (order.cancelReason === 'seller_rejected') return t('status.order.rejected')
    if (order.cancelReason === 'product_reserved_elsewhere') return t('status.order.expired')
  }
  return getOrderStatusText(order?.status, t) || order?.status || t('common.unknownStatus')
}

function formatPrice(value) {
  const price = Number(value)
  return `￥${Number.isFinite(price) ? price.toFixed(2) : '0.00'}`
}

function canCancel(order) {
  return activeRole.value === 'buyer' && order.status === 'pending'
}

function canSellerHandlePending(order) {
  return activeRole.value === 'seller' && order.status === 'pending'
}

function canComplete(order) {
  return order.status === 'confirmed'
}

function canReviewBuyerSide(order) {
  return activeRole.value === 'buyer'
    && order.status === 'completed'
    && !order.buyerReviewed
}

function canReviewSellerSide(order) {
  return activeRole.value === 'seller'
    && order.status === 'completed'
    && !order.sellerReviewed
}

async function updateOrderStatus(id, status) {
  return updateOrder(id, { status })
}

async function loadOrders() {
  loading.value = true
  try {
    const params = {
      role: activeRole.value,
      page: page.value,
      pageSize
    }
    if (activeStatus.value !== 'all') {
      params.status = activeStatus.value
    }

    const result = await getOrders(params)
    orders.value = Array.isArray(result?.items) ? result.items : []
  } catch (error) {
    orders.value = []
    ElMessage.error(error?.message || t('orders.loadFailed'))
  } finally {
    loading.value = false
  }
}

async function handleStatusAction(order, status, message) {
  const id = getOrderId(order)
  if (!id) return

  actingId.value = id
  try {
    await updateOrderStatus(id, status)
    ElMessage.success(message)
    await loadOrders()
  } catch (error) {
    ElMessage.error(error?.message || t('common.operationFailed'))
  } finally {
    actingId.value = ''
  }
}

function goProduct(order) {
  const productId = getProductId(order)
  if (!productId) return
  router.push(`/product/${productId}`)
}

function goReview(order, userId) {
  const id = getOrderId(order)
  if (!id || !userId) return
  router.push(`/reviews/${userId}?orderId=${id}`)
}

watch([activeRole, activeStatus], () => {
  page.value = 1
  loadOrders()
})

onMounted(loadOrders)
</script>

<style scoped>
.orders-page {
  min-height: calc(100vh - var(--mobile-nav-height));
  background: #F5F3F7;
}

.role-tabs {
  display: flex;
  padding: 0 28px;
  background: #fff;
}

.role-tab {
  flex: 1;
  min-height: 48px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: #fff;
  color: #666;
  cursor: pointer;
  font-size: 15px;
  font-weight: 700;
}

.role-tab.active {
  border-bottom-color: #CE57C1;
  color: #CE57C1;
}

.status-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 12px 14px;
  border-top: 1px solid #f0f0f0;
  background: #fff;
  scrollbar-width: none;
}

.status-tabs::-webkit-scrollbar {
  display: none;
}

.status-tab {
  flex: 0 0 auto;
  min-height: 30px;
  padding: 0 14px;
  border: 0;
  border-radius: 15px;
  background: transparent;
  color: #999;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}

.status-tab.active {
  background: #F0E6F6;
  color: #CE57C1;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-card {
  padding: 14px;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--shadow-card);
}

.order-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.order-status {
  color: #CE57C1;
  font-size: 13px;
  font-weight: 800;
}

.status-completed {
  color: #52c41a;
}

.status-cancelled {
  color: #999;
}

.order-time,
.order-user {
  color: #999;
  font-size: 12px;
}

.order-product {
  display: flex;
  width: 100%;
  padding: 12px 0;
  border: 0;
  border-top: 1px solid #f5f5f5;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.product-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 80px;
  height: 80px;
  overflow: hidden;
  margin-right: 12px;
  border-radius: 12px;
  background: #F0E6F6;
  color: #010544;
  padding: 0;
  font-weight: 800;
}

.product-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.order-product-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.product-title {
  display: block;
  overflow: hidden;
  color: #333;
  font-size: 16px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-price {
  color: #ff4d4f;
  font-size: 16px;
  font-weight: 700;
}

.order-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid #f5f5f5;
}

.order-actions button {
  min-height: 32px;
  padding: 0 14px;
  border: 1px solid #ddd;
  border-radius: 16px;
  background: #fff;
  color: #666;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}

.order-actions button.primary {
  border-color: #CE57C1;
  background: #CE57C1;
  color: #fff;
}

.orders-skeleton {
  padding: 8px 0;
}

@media (max-width: 600px) {
  .order-actions {
    justify-content: flex-start;
  }
}
</style>
