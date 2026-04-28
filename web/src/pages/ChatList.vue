<template>
  <section class="chat-list-page mobile-page">
    <div class="mobile-content">
      <div class="page-head">
        <span>{{ t('chatList.title') }}</span>
        <button type="button" :disabled="loading" @click="loadConversations(false)">{{ t('common.refresh') }}</button>
      </div>

      <el-skeleton
        v-if="loading && !conversations.length"
        class="list-skeleton"
        :rows="6"
        animated
      />

      <EmptyState
        v-else-if="!conversations.length"
        :text="t('chatList.empty')"
      />

      <div v-else class="conversation-list">
        <button
          v-for="item in conversations"
          :key="item.conversationId || item.otherUser?.id"
          class="conversation-card"
          type="button"
          @click="goChat(item)"
        >
          <el-avatar :size="48" :src="item.otherUser?.avatarUrl">
            {{ avatarText(item.otherUser) }}
          </el-avatar>

          <div class="conversation-main">
            <div class="conversation-top">
              <span class="nickname text-ellipsis">{{ item.otherUser?.nickName || t('common.userFallback') }}</span>
              <span class="time">{{ formatTime(item.lastMessage?.createdAt, t) }}</span>
            </div>
            <div class="conversation-bottom">
              <span class="preview text-ellipsis">{{ previewText(item.lastMessage) }}</span>
              <span v-if="item.unread" class="unread">{{ formatUnread(item.unread) }}</span>
            </div>
          </div>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import EmptyState from '../components/EmptyState.vue'
import { getConversations as listConversations } from '../api/messages'
import { formatTime } from '../utils/format'
import { useI18n } from '../utils/i18n'

const router = useRouter()
const { t } = useI18n()

const conversations = ref([])
const loading = ref(false)
let pollingTimer = null

function normalizeItems(result) {
  return Array.isArray(result?.items) ? result.items : []
}

async function loadConversations(showLoading = true) {
  if (showLoading) loading.value = true
  try {
    const result = await listConversations()
    conversations.value = normalizeItems(result)
  } catch (error) {
    if (showLoading) conversations.value = []
  } finally {
    if (showLoading) loading.value = false
  }
}

function pollConversations() {
  if (document.visibilityState !== 'visible') return
  loadConversations(false)
}

function avatarText(user) {
  return (user?.nickName || 'X').slice(0, 1).toUpperCase()
}

function previewText(message) {
  if (!message) return t('chatList.noMessage')
  if (message.type === 'image') return t('chatList.image')
  if (message.type === 'reservation') return message.content || t('chatList.reservation')
  return message.content || ''
}

function formatUnread(count) {
  const value = Number(count)
  if (!Number.isFinite(value) || value <= 0) return ''
  return value > 99 ? '99+' : String(value)
}

function goChat(item) {
  const otherUserId = item.otherUser?.id
  if (!otherUserId) return
  router.push({
    path: `/chat/${otherUserId}`,
    query: item.productId ? { productId: item.productId } : {}
  })
}

onMounted(() => {
  loadConversations()
  pollingTimer = window.setInterval(pollConversations, 5000)
})

onBeforeUnmount(() => {
  if (pollingTimer) window.clearInterval(pollingTimer)
})
</script>

<style scoped lang="scss">
.chat-list-page {
  margin: 0 auto;
  background: #F5F3F7;
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.page-head span {
  color: var(--color-dark);
  font-size: 16px;
  font-weight: 800;
}

.page-head button {
  min-height: 32px;
  padding: 0 14px;
  border: 0;
  border-radius: 16px;
  background: #F0E6F6;
  color: #CE57C1;
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
}

.list-skeleton {
  padding: 18px;
  border-radius: 16px;
  background: #fff;
}

.conversation-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.conversation-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  border: 0;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--shadow-card);
  color: inherit;
  padding: 14px;
  text-align: left;
  cursor: pointer;
}

.conversation-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(1, 5, 68, 0.12);
}

.conversation-main {
  min-width: 0;
  flex: 1;
}

.conversation-top,
.conversation-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.conversation-top {
  margin-bottom: 6px;
}

.nickname {
  min-width: 0;
  color: var(--color-dark);
  font-size: 16px;
  font-weight: 700;
}

.time {
  flex: 0 0 auto;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.preview {
  min-width: 0;
  color: #666;
  font-size: 14px;
}

.unread {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: var(--color-price);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  line-height: 20px;
}

</style>
