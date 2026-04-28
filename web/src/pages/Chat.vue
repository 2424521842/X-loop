<template>
  <section class="chat-page">
    <header class="chat-topbar">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">&lt;</button>
      <div class="peer-info">
        <el-avatar :size="36" :src="peerUser.avatarUrl">
          {{ peerName.slice(0, 1).toUpperCase() }}
        </el-avatar>
        <span class="peer-name text-ellipsis">{{ peerName }}</span>
      </div>
    </header>

    <main ref="messagePanel" class="message-panel">
      <div
        v-if="product"
        class="product-ref card"
      >
        <button
          class="product-link"
          type="button"
          @click="goProduct"
        >
          <img
            v-if="productImage"
            class="product-image"
            :src="productImage"
            :alt="product.title || '商品图片'"
            loading="lazy"
          >
          <div v-else class="product-placeholder">X</div>
          <div class="product-info">
            <div class="product-title text-ellipsis">{{ product.title || '未命名商品' }}</div>
            <div class="price">{{ formatPrice(product.price) }}</div>
          </div>
        </button>
        <button
          v-if="showReservationAction"
          class="reservation-trigger"
          type="button"
          :disabled="reservationActionDisabled"
          @click="handleStartReservation"
        >
          {{ reservationButtonText }}
        </button>
      </div>

      <el-skeleton
        v-if="loading"
        class="message-skeleton"
        :rows="6"
        animated
      />

      <EmptyState
        v-else-if="!messages.length"
        text="还没有消息，开始聊天吧"
      />

      <div v-else class="message-list">
        <template v-for="(message, index) in messages" :key="message.id">
          <div v-if="shouldShowTime(index)" class="time-separator">
            {{ formatMessageTime(message.createdAt) }}
          </div>
          <div
            class="message-row"
            :class="{ mine: isMine(message) }"
          >
            <el-avatar
              v-if="!isMine(message)"
              :size="32"
              :src="peerUser.avatarUrl"
            >
              {{ peerName.slice(0, 1).toUpperCase() }}
            </el-avatar>
            <div
              class="bubble"
              :class="{ 'reservation-bubble': message.type === 'reservation' }"
            >
              <template v-if="message.type === 'reservation'">
                <div class="reservation-card">
                  <div class="reservation-card-head">
                    <span class="reservation-title">预定邀请</span>
                    <span class="reservation-status" :class="reservationStatusClass(message)">
                      {{ reservationStatusText(message) }}
                    </span>
                  </div>
                  <div class="reservation-product">
                    <span class="reservation-product-title text-ellipsis">
                      {{ reservationProduct(message).title || product?.title || '未命名商品' }}
                    </span>
                    <span class="reservation-product-price">
                      {{ formatPrice(reservationProduct(message).price ?? product?.price) }}
                    </span>
                  </div>
                  <p class="reservation-copy">{{ message.content }}</p>
                  <div v-if="canHandleReservation(message)" class="reservation-actions">
                    <button
                      class="reservation-action primary"
                      type="button"
                      :disabled="actingReservationId === message.orderId"
                      @click="handleReservationAction(message, 'confirmed')"
                    >
                      同意
                    </button>
                    <button
                      class="reservation-action"
                      type="button"
                      :disabled="actingReservationId === message.orderId"
                      @click="handleReservationAction(message, 'cancelled')"
                    >
                      拒绝
                    </button>
                  </div>
                </div>
              </template>
              <img
                v-else-if="message.type === 'image'"
                class="message-image"
                :src="message.content"
                alt="聊天图片"
                loading="lazy"
              >
              <span v-else>{{ message.content }}</span>
            </div>
          </div>
        </template>
      </div>
    </main>

    <footer class="composer-bar">
      <el-input
        v-model="draft"
        class="composer-input"
        type="textarea"
        :autosize="{ minRows: 1, maxRows: 4 }"
        resize="none"
        placeholder="输入消息"
        @keydown.enter.exact.prevent="handleSend"
      />
      <el-button
        class="send-button"
        type="primary"
        :disabled="!draft.trim()"
        @click="handleSend"
      >
        发送
      </el-button>
    </footer>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '../components/EmptyState.vue'
import {
  getMessages as listMessagesWithUser,
  sendMessage
} from '../api/messages'
import { createOrder, updateOrder } from '../api/orders'
import { getProductById } from '../api/products'
import { getUserById } from '../api/users'
import { useUserStore } from '../store/user'
import { PRODUCT_STATUS_MAP, formatPrice } from '../utils/format'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const peerUser = ref({})
const product = ref(null)
const messages = ref([])
const loading = ref(false)
const draft = ref('')
const messagePanel = ref(null)
const sendingReservation = ref(false)
const actingReservationId = ref('')
let pollingTimer = null

const peerId = computed(() => String(route.params.userId || ''))
const productId = computed(() => String(route.query.productId || ''))
const currentUserId = computed(() => userStore.user?.id || userStore.user?._id || '')
const peerName = computed(() => peerUser.value?.nickName || 'X-Loop 用户')
const productSellerId = computed(() => product.value?.seller?.id || product.value?.sellerId || '')
const isProductSeller = computed(() => Boolean(currentUserId.value && productSellerId.value && currentUserId.value === productSellerId.value))
const productImage = computed(() => {
  const images = product.value?.images
  return Array.isArray(images) && images.length ? images[0] : ''
})
const myActiveReservation = computed(() => {
  return messages.value.find((message) => {
    const reservation = message.reservation
    return message.type === 'reservation'
      && reservation
      && (reservation.product?.id || message.productId) === productId.value
      && reservation.buyerId === currentUserId.value
      && ['pending', 'confirmed'].includes(reservation.status)
  })
})
const showReservationAction = computed(() => Boolean(product.value && !isProductSeller.value))
const reservationActionDisabled = computed(() => {
  return sendingReservation.value
    || product.value?.status !== 'on_sale'
    || Boolean(myActiveReservation.value)
})
const reservationButtonText = computed(() => {
  const activeReservation = myActiveReservation.value?.reservation
  if (sendingReservation.value) return '发送中...'
  if (activeReservation?.status === 'pending') return '等待卖家处理'
  if (activeReservation?.status === 'confirmed') return '卖家已同意'
  if (product.value?.status !== 'on_sale') {
    return PRODUCT_STATUS_MAP[product.value?.status] || '暂不可预定'
  }
  return '发起预定'
})
const lastMessageId = computed(() => {
  return messages.value.length ? messages.value[messages.value.length - 1].id : ''
})

function normalizeItems(result) {
  return Array.isArray(result?.items) ? result.items : []
}

function sortMessages(items) {
  return [...items].sort((left, right) => {
    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  })
}

function mergeMessages(items) {
  if (!items.length) return false
  const existed = new Set(messages.value.map((item) => item.id))
  const nextItems = items.filter((item) => item.id && !existed.has(item.id))
  const reservationUpdates = nextItems.filter((item) => item.type === 'reservation' && item.orderId && item.reservation)
  if (reservationUpdates.length) {
    messages.value = messages.value.map((message) => {
      const update = reservationUpdates.find((item) => item.orderId === message.orderId)
      if (!update || message.type !== 'reservation') return message
      return { ...message, reservation: update.reservation }
    })
  }
  if (!nextItems.length) return false
  messages.value = sortMessages([...messages.value, ...nextItems])
  return true
}

async function loadPeer() {
  if (!peerId.value) return
  try {
    peerUser.value = await getUserById(peerId.value)
  } catch (error) {
    peerUser.value = {}
  }
}

async function loadProduct() {
  if (!productId.value) {
    product.value = null
    return
  }
  try {
    product.value = await getProductById(productId.value)
  } catch (error) {
    product.value = null
  }
}

async function loadMessages() {
  if (!peerId.value) return
  loading.value = true
  try {
    const result = await listMessagesWithUser(peerId.value)
    messages.value = sortMessages(normalizeItems(result))
    await scrollToBottom()
  } finally {
    loading.value = false
  }
}

async function pollMessages() {
  if (document.visibilityState !== 'visible' || !peerId.value || !lastMessageId.value) return
  try {
    const result = await listMessagesWithUser(peerId.value, { since: lastMessageId.value })
    if (mergeMessages(normalizeItems(result))) {
      await scrollToBottom()
    }
  } catch (error) {
    // 轮询失败不打断当前聊天。
  }
}

function isMine(message) {
  return Boolean(currentUserId.value && message.fromUserId === currentUserId.value)
}

function reservationProduct(message) {
  return message.reservation?.product || {}
}

function reservationStatusText(message) {
  const reservation = message.reservation || {}
  if (reservation.status === 'pending') return '等待卖家处理'
  if (reservation.status === 'confirmed') return '已同意'
  if (reservation.cancelReason === 'seller_rejected') return '已拒绝'
  if (reservation.cancelReason === 'buyer_cancelled') return '已取消'
  if (reservation.cancelReason === 'product_reserved_elsewhere') return '已失效'
  if (reservation.status === 'cancelled') return '已取消'
  return '预定邀请'
}

function reservationStatusClass(message) {
  const reservation = message.reservation || {}
  return {
    'status-pending': reservation.status === 'pending',
    'status-confirmed': reservation.status === 'confirmed',
    'status-cancelled': reservation.status === 'cancelled'
  }
}

function canHandleReservation(message) {
  const reservation = message.reservation || {}
  return reservation.status === 'pending'
    && reservation.sellerId === currentUserId.value
    && !isMine(message)
}

function shouldShowTime(index) {
  if (index === 0) return true
  const current = new Date(messages.value[index].createdAt).getTime()
  const previous = new Date(messages.value[index - 1].createdAt).getTime()
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return false
  return current - previous > 5 * 60 * 1000
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function formatMessageTime(date) {
  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return ''
  const now = new Date()
  const sameDay = value.getFullYear() === now.getFullYear()
    && value.getMonth() === now.getMonth()
    && value.getDate() === now.getDate()
  const time = `${pad(value.getHours())}:${pad(value.getMinutes())}`
  if (sameDay) return `今天 ${time}`
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${time}`
}

async function scrollToBottom() {
  await nextTick()
  const panel = messagePanel.value
  if (!panel) return
  panel.scrollTop = panel.scrollHeight
}

async function handleSend() {
  const content = draft.value.trim()
  if (!content || !peerId.value) return

  const tempId = `temp-${Date.now()}`
  const optimisticMessage = {
    id: tempId,
    fromUserId: currentUserId.value,
    toUserId: peerId.value,
    content,
    type: 'text',
    createdAt: new Date().toISOString()
  }

  draft.value = ''
  messages.value = [...messages.value, optimisticMessage]
  await scrollToBottom()

  try {
    const saved = await sendMessage({
      toUserId: peerId.value,
      content,
      type: 'text',
      productId: productId.value || undefined
    })
    if (saved?.id) {
      messages.value = messages.value.map((item) => (item.id === tempId ? saved : item))
    }
    await scrollToBottom()
  } catch (error) {
    messages.value = messages.value.filter((item) => item.id !== tempId)
    draft.value = content
    ElMessage.error('消息发送失败，请稍后重试')
  }
}

async function handleStartReservation() {
  if (!productId.value || reservationActionDisabled.value) return

  sendingReservation.value = true
  try {
    await createOrder({ productId: productId.value })
    ElMessage.success('预定邀请已发送')
    await Promise.all([loadMessages(), loadProduct()])
    await scrollToBottom()
  } catch (error) {
    ElMessage.error(error?.message || '预定邀请发送失败')
  } finally {
    sendingReservation.value = false
  }
}

async function handleReservationAction(message, status) {
  if (!message.orderId || actingReservationId.value) return

  actingReservationId.value = message.orderId
  try {
    await updateOrder(message.orderId, { status })
    ElMessage.success(status === 'confirmed' ? '已同意预定' : '已拒绝预定')
    await Promise.all([loadMessages(), loadProduct()])
    await scrollToBottom()
  } catch (error) {
    ElMessage.error(error?.message || '操作失败')
  } finally {
    actingReservationId.value = ''
  }
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.push('/chat-list')
}

function goProduct() {
  if (!productId.value) return
  router.push(`/product/${productId.value}`)
}

async function bootPage() {
  await Promise.all([loadPeer(), loadProduct(), loadMessages()])
}

watch(
  () => route.params.userId,
  async () => {
    messages.value = []
    await bootPage()
  }
)

onMounted(() => {
  bootPage()
  pollingTimer = window.setInterval(pollMessages, 3000)
})

onBeforeUnmount(() => {
  if (pollingTimer) window.clearInterval(pollingTimer)
})
</script>

<style scoped lang="scss">
.chat-page {
  display: flex;
  flex-direction: column;
  width: min(var(--mobile-shell-max), 100%);
  min-height: 100vh;
  margin: 0 auto;
  background: var(--color-bg);
}

.chat-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: var(--mobile-nav-height);
  padding: 10px 16px;
  background: var(--gradient-brand);
  box-shadow: 0 4px 18px rgba(1, 5, 68, 0.12);
}

.back-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
}

.peer-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.peer-name {
  color: #fff;
  font-size: 17px;
  font-weight: 700;
}

.message-panel {
  flex: 1;
  min-height: 0;
  max-height: calc(100vh - var(--mobile-nav-height) - 76px);
  overflow-y: auto;
  padding: 14px 16px 96px;
}

.product-ref {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  margin: 0 0 14px;
  border-radius: 16px;
  border: 0;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.product-link {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 12px;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.product-image,
.product-placeholder {
  flex: 0 0 auto;
  width: 64px;
  height: 64px;
  border-radius: 8px;
  object-fit: cover;
}

.product-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-brand);
  color: #fff;
  font-weight: 900;
}

.product-info {
  flex: 1;
  min-width: 0;
}

.product-title {
  margin-bottom: 6px;
  color: var(--color-dark);
  font-weight: 700;
}

.reservation-trigger {
  flex: 0 0 auto;
  min-width: 92px;
  height: 34px;
  padding: 0 12px;
  border: 0;
  border-radius: 17px;
  background: var(--gradient-brand);
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
}

.reservation-trigger:disabled {
  background: #eeedf0;
  color: #777681;
  cursor: not-allowed;
}

.message-skeleton {
  padding: 18px;
  border-radius: 8px;
  background: #fff;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.time-separator {
  align-self: center;
  padding: 3px 8px;
  border-radius: 8px;
  background: rgba(1, 5, 68, 0.08);
  color: var(--color-text-secondary);
  font-size: 12px;
}

.message-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.message-row.mine {
  justify-content: flex-end;
}

.bubble {
  max-width: 62%;
  padding: 10px 12px;
  border-radius: 14px;
  background: #eee;
  color: var(--color-text);
  font-size: 15px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-row.mine .bubble {
  background: var(--gradient-brand);
  color: #fff;
}

.reservation-bubble {
  width: min(300px, 72vw);
  max-width: min(300px, 72vw);
  padding: 0;
  overflow: hidden;
  background: #fff;
  color: var(--color-text);
  white-space: normal;
}

.message-row.mine .reservation-bubble {
  background: #fff;
  color: var(--color-text);
}

.reservation-card {
  padding: 12px;
}

.reservation-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.reservation-title {
  color: var(--color-dark);
  font-size: 15px;
  font-weight: 800;
}

.reservation-status {
  flex: 0 0 auto;
  padding: 3px 8px;
  border-radius: 999px;
  background: #eeedf0;
  color: #777681;
  font-size: 12px;
  font-weight: 800;
}

.reservation-status.status-pending {
  background: #fff0d7;
  color: #b76a00;
}

.reservation-status.status-confirmed {
  background: #d7ffe0;
  color: #12823a;
}

.reservation-status.status-cancelled {
  background: #ffdad7;
  color: #b42318;
}

.reservation-product {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px;
  border-radius: 10px;
  background: #F5F3F7;
}

.reservation-product-title {
  min-width: 0;
  color: var(--color-dark);
  font-size: 13px;
  font-weight: 700;
}

.reservation-product-price {
  flex: 0 0 auto;
  color: var(--color-price);
  font-weight: 800;
}

.reservation-copy {
  margin: 10px 0 0;
  color: #666;
  font-size: 13px;
}

.reservation-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.reservation-action {
  height: 30px;
  padding: 0 14px;
  border: 1px solid #ddd;
  border-radius: 15px;
  background: #fff;
  color: #464650;
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
}

.reservation-action.primary {
  border-color: transparent;
  background: var(--gradient-brand);
  color: #fff;
}

.reservation-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.message-image {
  max-width: min(240px, 100%);
  border-radius: 8px;
}

.composer-bar {
  position: fixed;
  right: max(12px, calc((100vw - var(--mobile-shell-max)) / 2));
  bottom: 0;
  left: max(12px, calc((100vw - var(--mobile-shell-max)) / 2));
  z-index: 30;
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 10px 0 calc(10px + env(safe-area-inset-bottom));
  background: var(--color-bg);
}

.composer-input {
  flex: 1;
}

.send-button {
  min-width: 76px;
}

@media (max-width: 600px) {
  .chat-topbar {
    padding: 10px 12px;
  }

  .message-panel {
    padding: 12px 12px 92px;
  }

  .bubble {
    max-width: 75%;
  }

  .product-ref {
    align-items: stretch;
    flex-direction: column;
  }

  .reservation-trigger {
    width: 100%;
  }

  .composer-bar {
    right: 12px;
    left: 12px;
  }
}
</style>
