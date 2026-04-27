<template>
  <section class="orders-page">
    <div class="page-head">
      <div>
        <h1>订单管理</h1>
        <p>查看买入和卖出的交易进度。</p>
      </div>
    </div>

    <div class="orders-panel">
      <el-tabs v-model="activeRole" class="role-tabs">
        <el-tab-pane label="我买的" name="buyer" />
        <el-tab-pane label="我卖的" name="seller" />
      </el-tabs>

      <div class="filter-bar">
        <el-radio-group v-model="activeStatus" size="small">
          <el-radio-button
            v-for="item in statusFilters"
            :key="item.value"
            :label="item.value"
          >
            {{ item.label }}
          </el-radio-button>
        </el-radio-group>
      </div>

      <el-skeleton
        v-if="loading"
        class="orders-skeleton"
        :rows="6"
        animated
      />

      <EmptyState
        v-else-if="orders.length === 0"
        title="暂无订单"
        text="暂无订单"
      />

      <div v-else class="order-list">
        <article
          v-for="order in orders"
          :key="order.id || order._id"
          class="order-card"
        >
          <button
            class="product-thumb"
            type="button"
            @click="goProduct(order)"
          >
            <img
              v-if="getProductImage(order)"
              :src="getProductImage(order)"
              :alt="getProductTitle(order)"
              loading="lazy"
            >
            <span v-else>X</span>
          </button>

          <div class="order-main">
            <div class="order-title-row">
              <button
                class="product-title"
                type="button"
                @click="goProduct(order)"
              >
                {{ getProductTitle(order) }}
              </button>
              <el-tag :type="getStatusTagType(order.status)" effect="light">
                {{ statusText(order.status) }}
              </el-tag>
            </div>

            <div class="order-meta">
              <span class="order-price">{{ formatPrice(order.price || order.product?.price) }}</span>
              <span>{{ activeRole === 'buyer' ? '卖家' : '买家' }}：{{ order.counterpart?.nickName || 'X-Loop 用户' }}</span>
              <span>{{ formatTime(order.createdAt) }}</span>
            </div>
          </div>

          <div class="order-actions">
            <el-button
              v-if="canCancel(order)"
              size="small"
              :loading="actingId === getOrderId(order)"
              @click="handleStatusAction(order, 'cancelled', '订单已取消')"
            >
              取消订单
            </el-button>

            <template v-if="canSellerHandlePending(order)">
              <el-button
                size="small"
                type="primary"
                :loading="actingId === getOrderId(order)"
                @click="handleStatusAction(order, 'confirmed', '已确认接单')"
              >
                确认接单
              </el-button>
              <el-button
                size="small"
                :loading="actingId === getOrderId(order)"
                @click="handleStatusAction(order, 'cancelled', '已拒绝订单')"
              >
                拒绝
              </el-button>
            </template>

            <el-button
              v-if="canComplete(order)"
              size="small"
              type="primary"
              :loading="actingId === getOrderId(order)"
              @click="handleStatusAction(order, 'completed', '订单已完成')"
            >
              确认完成
            </el-button>

            <el-button
              v-if="canReviewBuyerSide(order)"
              size="small"
              type="primary"
              @click="goReview(order, order.sellerId)"
            >
              评价卖家
            </el-button>

            <el-button
              v-if="canReviewSellerSide(order)"
              size="small"
              type="primary"
              @click="goReview(order, order.buyerId)"
            >
              评价买家
            </el-button>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import EmptyState from '../components/EmptyState.vue'
import { getOrders, updateOrder } from '../api/orders'
import { formatTime } from '../utils/format'

const router = useRouter()

const orders = ref([])
const loading = ref(false)
const actingId = ref('')
const activeRole = ref('buyer')
const activeStatus = ref('all')
const page = ref(1)
const pageSize = 50

const statusFilters = [
  { label: '全部', value: 'all' },
  { label: '待确认', value: 'pending' },
  { label: '已确认', value: 'confirmed' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' }
]

const statusMap = {
  pending: '待确认',
  confirmed: '已确认',
  completed: '已完成',
  cancelled: '已取消'
}

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
  return getProduct(order).title || order?.snapshot?.title || '未命名商品'
}

function getProductImage(order) {
  return getProduct(order).image || order?.snapshot?.image || ''
}

function statusText(status) {
  return statusMap[status] || status || '未知状态'
}

function getStatusTagType(status) {
  const typeMap = {
    pending: 'warning',
    confirmed: 'primary',
    completed: 'success',
    cancelled: 'info'
  }
  return typeMap[status] || 'info'
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
    ElMessage.error(error?.message || '订单加载失败')
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
    ElMessage.error(error?.message || '操作失败')
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
  min-height: calc(100vh - 64px);
  padding: 28px 0 40px;
  background: #F5F3F7;
}

.page-head,
.orders-panel {
  width: min(1040px, calc(100% - 32px));
  margin: 0 auto;
}

.page-head {
  margin-bottom: 18px;
}

.page-head h1 {
  margin: 0;
  color: #010544;
  font-size: 28px;
  line-height: 1.2;
}

.page-head p {
  margin: 8px 0 0;
  color: #666;
  font-size: 14px;
}

.orders-panel {
  padding: 20px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(1, 5, 68, 0.08);
}

.filter-bar {
  display: flex;
  justify-content: flex-end;
  margin: -4px 0 18px;
}

.order-list {
  display: grid;
  gap: 12px;
}

.order-card {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 14px;
  border: 1px solid #eee8f4;
  border-radius: 8px;
  background: #fff;
}

.product-thumb {
  display: flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 0;
  border-radius: 6px;
  background: #F0E6F6;
  color: #010544;
  cursor: pointer;
  font-weight: 700;
  padding: 0;
}

.product-thumb img {
  width: 48px;
  height: 48px;
  object-fit: cover;
}

.order-main {
  min-width: 0;
}

.order-title-row {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.product-title {
  min-width: 0;
  border: 0;
  background: transparent;
  color: #010544;
  cursor: pointer;
  font-size: 16px;
  font-weight: 700;
  overflow: hidden;
  padding: 0;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-title:hover {
  color: #CE57C1;
}

.order-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin-top: 8px;
  color: #777;
  font-size: 13px;
}

.order-price {
  color: #ff4d4f;
  font-weight: 700;
}

.order-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.orders-skeleton {
  padding: 8px 0;
}

:deep(.el-tabs__active-bar) {
  background-color: #CE57C1;
}

:deep(.el-tabs__item.is-active),
:deep(.el-tabs__item:hover) {
  color: #010544;
}

:deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  border-color: #CE57C1;
  background: #CE57C1;
  box-shadow: -1px 0 0 0 #CE57C1;
}

:deep(.el-button--primary) {
  border-color: #CE57C1;
  background: #CE57C1;
}

@media (max-width: 600px) {
  .orders-page {
    padding: 18px 0 28px;
  }

  .page-head,
  .orders-panel {
    width: min(100% - 24px, 1040px);
  }

  .orders-panel {
    padding: 14px;
  }

  .filter-bar {
    justify-content: flex-start;
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .order-card {
    grid-template-columns: 48px minmax(0, 1fr);
  }

  .order-actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
}
</style>
