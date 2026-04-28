<template>
  <section class="search-page mobile-page">
    <div class="search-bar-sticky">
      <div class="search-bar-wrap">
        <label class="search-input-box">
          <span class="search-prefix" aria-hidden="true">⌕</span>
          <input
            v-model="keyword"
            class="search-input"
            placeholder="搜索你想要的宝贝"
            type="search"
            @keyup.enter="handleSubmit"
          >
        </label>
        <button class="search-button" type="button" @click="handleSubmit">搜索</button>
      </div>
    </div>

    <section
      v-if="!activeQuery"
      class="history-section"
      aria-label="搜索历史"
    >
      <div class="history-header">
        <h2>搜索历史</h2>
        <button
          v-if="historyList.length"
          class="clear-history"
          type="button"
          @click="clearHistory"
        >
          清空
        </button>
      </div>

      <div
        v-if="historyList.length"
        class="history-list"
      >
        <button
          v-for="item in historyList"
          :key="item"
          class="history-chip"
          type="button"
          @click="handleHistorySearch(item)"
        >
          {{ item }}
        </button>
      </div>

      <p
        v-else
        class="history-empty"
      >
        暂无搜索记录
      </p>
    </section>

    <section
      v-if="activeQuery"
      class="results-section"
    >
      <div class="filter-section">
        <div class="filter-scroll">
          <button
            v-for="item in filterTabs"
            :key="item.value"
            class="filter-chip"
            :class="{ active: activeFilter === item.value }"
            type="button"
            @click="activeFilter = item.value"
          >
            {{ item.label }}
          </button>
        </div>
      </div>

      <el-skeleton
        v-if="loading"
        class="search-skeleton"
        :rows="6"
        animated
      />

      <template v-else>
        <EmptyState
          v-if="!displayedProducts.length"
          text="未找到相关商品"
        />

        <template v-else>
          <div class="result-meta">
            <span class="result-count">找到 {{ displayedProducts.length }} 个相关宝贝</span>
            <span class="result-sort">{{ resultSortText }}</span>
          </div>
          <div class="result-list">
            <ProductCard
              v-for="item in displayedProducts"
              :key="item.id || item._id"
              :product="item"
              variant="list"
            />
          </div>
        </template>
      </template>
    </section>

  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElSkeleton } from 'element-plus'
import { searchProducts } from '../api/products'
import ProductCard from '../components/ProductCard.vue'
import EmptyState from '../components/EmptyState.vue'
import { useUserStore } from '../store/user'

const HISTORY_KEY = 'xloop:searchHistory'
const HISTORY_LIMIT = 10

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const keyword = ref('')
const products = ref([])
const loading = ref(false)
const historyList = ref([])
const activeQuery = ref('')
const activeFilter = ref('all')
const skipNextRouteSearch = ref(false)
let searchRequestId = 0

const hasWindowStorage = computed(() => typeof window !== 'undefined' && window.localStorage)
const userCampus = computed(() => userStore.user?.campus || '')
const filterTabs = computed(() => {
  const tabs = [
    { label: '综合', value: 'all' },
    { label: '价格最低', value: 'price_asc' }
  ]
  if (userCampus.value) {
    tabs.push({ label: '同校区', value: 'campus' })
  }
  return tabs
})
const resultSortText = computed(() => {
  const match = filterTabs.value.find((item) => item.value === activeFilter.value)
  return match ? `${match.label}排序` : '综合排序'
})
const displayedProducts = computed(() => {
  const items = [...products.value]
  if (activeFilter.value === 'price_asc') {
    return items.sort((left, right) => Number(left.price || 0) - Number(right.price || 0))
  }
  if (activeFilter.value === 'campus') {
    return items.filter((item) => item.campus === userCampus.value)
  }
  return items
})

function normalizeQuery(value) {
  if (Array.isArray(value)) return String(value[0] || '').trim()
  return String(value || '').trim()
}

function normalizeItems(result) {
  if (Array.isArray(result)) return result
  if (Array.isArray(result?.items)) return result.items
  if (Array.isArray(result?.list)) return result.list
  return []
}

function loadHistory() {
  if (!hasWindowStorage.value) return

  try {
    const parsed = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || '[]')
    historyList.value = Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === 'string' && item.trim()).slice(0, HISTORY_LIMIT)
      : []
  } catch (error) {
    historyList.value = []
  }
}

function saveHistory(term) {
  const nextTerm = term.trim()
  if (!nextTerm) return

  const lowerTerm = nextTerm.toLowerCase()
  const nextHistory = [
    nextTerm,
    ...historyList.value.filter((item) => item.toLowerCase() !== lowerTerm)
  ].slice(0, HISTORY_LIMIT)

  historyList.value = nextHistory

  if (!hasWindowStorage.value) return

  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory))
  } catch (error) {
    // localStorage 可能不可写，忽略即可，不影响搜索功能。
  }
}

function clearHistory() {
  historyList.value = []

  if (!hasWindowStorage.value) return

  try {
    window.localStorage.removeItem(HISTORY_KEY)
  } catch (error) {
    // localStorage 可能不可写，忽略即可。
  }
}

function resetResults() {
  searchRequestId += 1
  activeQuery.value = ''
  products.value = []
  loading.value = false
}

async function fetchResults(term) {
  const query = term.trim()
  if (!query) {
    resetResults()
    return
  }

  const requestId = ++searchRequestId
  activeQuery.value = query
  activeFilter.value = 'all'
  products.value = []
  loading.value = true
  saveHistory(query)

  try {
    const result = await searchProducts(query)
    if (requestId !== searchRequestId) return
    products.value = normalizeItems(result)
  } catch (error) {
    if (requestId === searchRequestId) {
      products.value = []
      ElMessage.error(error?.message || '搜索失败，请稍后重试')
    }
  } finally {
    if (requestId === searchRequestId) {
      loading.value = false
    }
  }
}

async function handleSubmit() {
  const nextQuery = keyword.value.trim()

  if (!nextQuery) {
    keyword.value = ''
    await router.replace({ query: {} })
    resetResults()
    return
  }

  keyword.value = nextQuery

  if (normalizeQuery(route.query.q) !== nextQuery) {
    skipNextRouteSearch.value = true
    await router.replace({ query: { q: nextQuery } })
  }

  await fetchResults(nextQuery)
}

function handleHistorySearch(term) {
  keyword.value = term
  handleSubmit()
}

onMounted(() => {
  loadHistory()

  const initialQuery = normalizeQuery(route.query.q)
  keyword.value = initialQuery

  if (initialQuery) {
    fetchResults(initialQuery)
  }
})

watch(
  () => route.query.q,
  (value) => {
    const nextQuery = normalizeQuery(value)
    keyword.value = nextQuery

    if (skipNextRouteSearch.value) {
      skipNextRouteSearch.value = false
      return
    }

    if (nextQuery) {
      fetchResults(nextQuery)
    } else {
      resetResults()
    }
  }
)

watch(filterTabs, (tabs) => {
  if (!tabs.some((item) => item.value === activeFilter.value)) {
    activeFilter.value = 'all'
  }
})
</script>

<style scoped lang="scss">
.search-page {
  margin: 0 auto;
  padding: 0 0 40px;
  background: #F5F3F7;
}

.search-bar-sticky {
  position: sticky;
  top: var(--mobile-nav-height);
  z-index: 80;
  padding: 12px 14px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.search-bar-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-input-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  background: #f5f3f7;
}

.search-prefix {
  color: #777681;
  font-size: 15px;
}

.search-input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: #1b1b1e;
  font-size: 14px;
}

.search-button {
  flex: 0 0 auto;
  min-height: 40px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(to right, #010544, #CE57C1);
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}

.history-section {
  padding: 28px 18px;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.history-header h2 {
  margin: 0;
  color: #1b1b1e;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0;
}

.clear-history {
  padding: 0;
  border: 0;
  background: transparent;
  color: #CE57C1;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}

.history-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.history-chip {
  min-height: 32px;
  padding: 0 16px;
  border: 0;
  border-radius: 16px;
  cursor: pointer;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  color: #464650;
  font-size: 12px;
  font-weight: 600;
}

.history-empty {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.results-section {
  min-height: 240px;
}

.filter-section {
  padding: 12px 0;
  border-bottom: 1px solid #f0e6f6;
  background: #fff;
}

.filter-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 0 14px;
  scrollbar-width: none;
  white-space: nowrap;
}

.filter-scroll::-webkit-scrollbar {
  display: none;
}

.filter-chip {
  flex: 0 0 auto;
  min-height: 32px;
  padding: 0 14px;
  border: 0;
  border-radius: 16px;
  background: #f5f3f7;
  color: #464650;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}

.filter-chip.active {
  background: #F0E6F6;
  color: #010544;
}

.search-skeleton {
  margin: 14px;
  padding: 18px;
  border-radius: 16px;
  background: #fff;
}

.result-count {
  color: #777681;
  font-size: 12px;
}

.result-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 8px;
}

.result-sort {
  color: #464650;
  font-size: 12px;
  font-weight: 700;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 14px 24px;
}

@media (min-width: 768px) {
  .search-page {
    box-shadow: 0 0 0 1px rgba(1, 5, 68, 0.03);
  }
}
</style>
