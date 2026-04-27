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
      <button
        v-if="product"
        class="product-ref card"
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
            <div class="bubble">
              <img
                v-if="message.type === 'image'"
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
import { getProductById } from '../api/products'
import { getUserById } from '../api/users'
import { useUserStore } from '../store/user'
import { formatPrice } from '../utils/format'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const peerUser = ref({})
const product = ref(null)
const messages = ref([])
const loading = ref(false)
const draft = ref('')
const messagePanel = ref(null)
let pollingTimer = null

const peerId = computed(() => String(route.params.userId || ''))
const productId = computed(() => String(route.query.productId || ''))
const currentUserId = computed(() => userStore.user?.id || userStore.user?._id || '')
const peerName = computed(() => peerUser.value?.nickName || 'X-Loop 用户')
const productImage = computed(() => {
  const images = product.value?.images
  return Array.isArray(images) && images.length ? images[0] : ''
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
  min-width: 0;
}

.product-title {
  margin-bottom: 6px;
  color: var(--color-dark);
  font-weight: 700;
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

  .composer-bar {
    right: 12px;
    left: 12px;
  }
}
</style>
