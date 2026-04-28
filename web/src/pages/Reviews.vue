<template>
  <section class="reviews-page">
    <el-skeleton
      v-if="loadingUser"
      class="reviews-shell"
      :rows="5"
      animated
    />

    <div v-else-if="userError" class="reviews-shell error-state">
      <h1>{{ t('reviews.unavailable') }}</h1>
      <p>{{ userError }}</p>
      <el-button type="primary" @click="router.back()">{{ t('common.back') }}</el-button>
    </div>

    <template v-else>
      <header class="user-header">
        <el-avatar :size="64" :src="user.avatarUrl">
          {{ userName.slice(0, 1).toUpperCase() }}
        </el-avatar>
        <div class="user-info">
          <h1>{{ userName }}</h1>
          <div class="user-meta">
            <span>{{ t('reviews.credit', { score: user.credit ?? 100 }) }}</span>
            <span>{{ t('reviews.reviewCount', { count: user.reviewCount ?? reviewCount }) }}</span>
          </div>
        </div>
      </header>

      <main class="reviews-shell">
        <section v-if="writeMode" class="review-form">
          <h2>{{ t('reviews.writeTitle') }}</h2>
          <div class="form-row">
            <span class="form-label">{{ t('reviews.rating') }}</span>
            <el-rate
              v-model="rating"
              :max="5"
              :allow-half="false"
            />
          </div>

          <el-input
            v-model="content"
            type="textarea"
            :rows="5"
            maxlength="200"
            show-word-limit
            :placeholder="t('reviews.placeholder')"
          />

          <div class="form-actions">
            <el-button @click="router.back()">{{ t('common.cancel') }}</el-button>
            <el-button
              type="primary"
              :loading="submitting"
              @click="handleSubmit"
            >
              {{ t('reviews.submit') }}
            </el-button>
          </div>
        </section>

        <section v-else class="review-view">
          <div class="rating-summary">
            <div>
              <strong>{{ avgRatingText }}</strong>
              <span>{{ t('reviews.avgRating') }}</span>
            </div>
            <div>
              <strong>{{ reviewCount }}</strong>
              <span>{{ t('reviews.count') }}</span>
            </div>
          </div>

          <el-skeleton
            v-if="loadingReviews"
            :rows="5"
            animated
          />

          <EmptyState
            v-else-if="reviews.length === 0"
            :title="t('reviews.emptyTitle')"
            :text="t('reviews.emptyText')"
          />

          <div v-else class="review-list">
            <article
              v-for="review in reviews"
              :key="review.id || review._id"
              class="review-card"
            >
              <el-avatar :size="40" :src="review.from?.avatarUrl">
                {{ reviewerName(review).slice(0, 1).toUpperCase() }}
              </el-avatar>
              <div class="review-main">
                <div class="review-top">
                  <span class="reviewer-name">{{ reviewerName(review) }}</span>
                  <span class="review-time">{{ formatTime(review.createdAt, t) }}</span>
                </div>
                <el-rate
                  :model-value="Number(review.rating) || 0"
                  disabled
                  size="small"
                />
                <p>{{ review.content }}</p>
              </div>
            </article>
          </div>
        </section>
      </main>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '../components/EmptyState.vue'
import { createReview, getUserReviews } from '../api/reviews'
import { getUserById } from '../api/users'
import { formatTime } from '../utils/format'
import { useI18n } from '../utils/i18n'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const user = ref({})
const userError = ref('')
const reviews = ref([])
const avgRating = ref(0)
const reviewCount = ref(0)
const rating = ref(0)
const content = ref('')
const loadingUser = ref(false)
const loadingReviews = ref(false)
const submitting = ref(false)

const userId = computed(() => String(route.params.userId || ''))
const orderId = computed(() => String(route.query.orderId || ''))
const writeMode = computed(() => Boolean(orderId.value))
const userName = computed(() => user.value?.nickName || t('common.userFallback'))
const avgRatingText = computed(() => {
  const value = Number(avgRating.value)
  return Number.isFinite(value) ? value.toFixed(1) : '0.0'
})

function reviewerName(review) {
  return review?.from?.nickName || t('common.userFallback')
}

async function loadUser() {
  loadingUser.value = true
  userError.value = ''
  try {
    user.value = await getUserById(userId.value)
  } catch (error) {
    user.value = {}
    userError.value = error?.message || t('reviews.userLoadFailed')
    ElMessage.error(userError.value)
  } finally {
    loadingUser.value = false
  }
}

async function loadReviews() {
  if (writeMode.value) {
    reviews.value = []
    avgRating.value = 0
    reviewCount.value = 0
    return
  }

  loadingReviews.value = true
  try {
    const result = await getUserReviews(userId.value)
    reviews.value = Array.isArray(result?.items) ? result.items : []
    avgRating.value = result?.avgRating || 0
    reviewCount.value = result?.count || reviews.value.length
  } catch (error) {
    reviews.value = []
    avgRating.value = 0
    reviewCount.value = 0
    ElMessage.error(error?.message || t('reviews.loadFailed'))
  } finally {
    loadingReviews.value = false
  }
}

async function loadPage() {
  await loadUser()
  if (!userError.value) {
    await loadReviews()
  }
}

async function handleSubmit() {
  const text = content.value.trim()
  if (rating.value < 1) {
    ElMessage.error(t('reviews.ratingRequired'))
    return
  }
  if (!text) {
    ElMessage.error(t('reviews.contentRequired'))
    return
  }

  submitting.value = true
  try {
    await createReview({
      orderId: orderId.value,
      rating: rating.value,
      content: text
    })
    ElMessage.success(t('reviews.submitted'))
    router.replace('/orders')
  } catch (error) {
    ElMessage.error(error?.message || t('reviews.submitFailed'))
  } finally {
    submitting.value = false
  }
}

watch(
  () => [route.params.userId, route.query.orderId],
  () => {
    rating.value = 0
    content.value = ''
    loadPage()
  }
)

onMounted(loadPage)
</script>

<style scoped>
.reviews-page {
  min-height: calc(100vh - 64px);
  padding: 28px 0 40px;
  background: #F5F3F7;
}

.user-header,
.reviews-shell {
  width: min(860px, calc(100% - 32px));
  margin: 0 auto;
}

.user-header {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 18px;
  padding: 22px;
  border-radius: 8px;
  background: linear-gradient(to right, #010544, #CE57C1);
  color: #fff;
}

.user-info {
  min-width: 0;
}

.user-info h1 {
  margin: 0;
  font-size: 26px;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.user-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.86);
  font-size: 14px;
}

.reviews-shell {
  padding: 22px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(1, 5, 68, 0.08);
}

.error-state {
  text-align: center;
}

.error-state h1,
.review-form h2 {
  margin: 0 0 10px;
  color: #010544;
}

.error-state p {
  margin: 0 0 18px;
  color: #666;
}

.review-form {
  display: grid;
  gap: 18px;
}

.form-row {
  display: flex;
  gap: 16px;
  align-items: center;
}

.form-label {
  color: #010544;
  font-weight: 700;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.rating-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.rating-summary > div {
  padding: 16px;
  border-radius: 8px;
  background: #F0E6F6;
}

.rating-summary strong {
  display: block;
  color: #010544;
  font-size: 28px;
  line-height: 1;
}

.rating-summary span {
  display: block;
  margin-top: 8px;
  color: #666;
  font-size: 13px;
}

.review-list {
  display: grid;
  gap: 12px;
}

.review-card {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 12px;
  padding: 14px;
  border: 1px solid #eee8f4;
  border-radius: 8px;
}

.review-main {
  min-width: 0;
}

.review-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 4px;
}

.reviewer-name {
  color: #010544;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-time {
  flex: 0 0 auto;
  color: #999;
  font-size: 13px;
}

.review-card p {
  margin: 8px 0 0;
  color: #333;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

:deep(.el-button--primary) {
  border-color: #CE57C1;
  background: #CE57C1;
}

@media (max-width: 600px) {
  .reviews-page {
    padding: 18px 0 28px;
  }

  .user-header,
  .reviews-shell {
    width: min(100% - 24px, 860px);
  }

  .user-header,
  .reviews-shell {
    padding: 16px;
  }

  .rating-summary {
    grid-template-columns: 1fr;
  }

  .review-top {
    display: grid;
    gap: 4px;
  }

  .review-time {
    flex: initial;
  }

  .form-actions {
    justify-content: stretch;
  }

  .form-actions .el-button {
    flex: 1;
  }
}
</style>
