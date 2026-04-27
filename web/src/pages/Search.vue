<template>
  <section class="search-page">
    <div class="search-panel">
      <el-input
        v-model="keyword"
        class="search-input"
        placeholder="搜索教材、电子产品、生活用品"
        clearable
        @keyup.enter="handleSubmit"
      >
        <template #prefix>
          <el-icon class="search-prefix" aria-hidden="true">
            <span>⌕</span>
          </el-icon>
        </template>
      </el-input>

      <el-button
        class="search-button"
        type="primary"
        @click="handleSubmit"
      >
        搜索
      </el-button>
    </div>

    <section
      v-if="!activeQuery"
      class="history-section"
      aria-label="搜索历史"
    >
      <div class="history-header">
        <h2>搜索历史</h2>
        <el-button
          v-if="historyList.length"
          class="clear-history"
          text
          @click="clearHistory"
        >
          清空历史
        </el-button>
      </div>

      <div
        v-if="historyList.length"
        class="history-list"
      >
        <el-tag
          v-for="item in historyList"
          :key="item"
          class="history-chip"
          effect="plain"
          @click="handleHistorySearch(item)"
        >
          {{ item }}
        </el-tag>
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
      <el-skeleton
        v-if="loading"
        class="search-skeleton"
        :rows="6"
        animated
      />

      <template v-else>
        <EmptyState
          v-if="!products.length"
          text="没有找到相关商品"
        />

        <template v-else>
          <div class="result-count">共找到 {{ products.length }} 件商品</div>
          <div class="product-grid">
            <ProductCard
              v-for="item in products"
              :key="item.id || item._id"
              :product="item"
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
import { ElMessage, ElSkeleton, ElInput, ElButton, ElTag, ElIcon } from 'element-plus'
import { searchProducts } from '../api/products'
import ProductCard from '../components/ProductCard.vue'
import EmptyState from '../components/EmptyState.vue'

const HISTORY_KEY = 'xloop:searchHistory'
const HISTORY_LIMIT = 10

const route = useRoute()
const router = useRouter()

const keyword = ref('')
const products = ref([])
const loading = ref(false)
const historyList = ref([])
const activeQuery = ref('')
const skipNextRouteSearch = ref(false)
let searchRequestId = 0

const hasWindowStorage = computed(() => typeof window !== 'undefined' && window.localStorage)

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
</script>

<style scoped lang="scss">
.search-page {
  width: min(1280px, 100%);
  margin: 0 auto;
  padding: 20px 16px 40px;
  background: #F5F3F7;
}

.search-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px;
  border-radius: 8px;
  background: #fff;
  box-shadow: var(--shadow-card);
}

.search-input {
  flex: 1;
}

.search-prefix {
  color: var(--color-text-secondary);
  font-size: 16px;
}

.search-button {
  min-width: 96px;
  border: 0;
  background: linear-gradient(to right, #010544, #CE57C1);
  font-weight: 700;
}

.search-button:hover,
.search-button:focus {
  border: 0;
  background: linear-gradient(to right, #010544, #CE57C1);
  opacity: 0.92;
}

.history-section {
  margin-top: 18px;
  padding: 18px;
  border-radius: 8px;
  background: #fff;
  box-shadow: var(--shadow-card);
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
  color: #010544;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0;
}

.clear-history {
  color: #CE57C1;
  font-weight: 700;
}

.history-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.history-chip {
  cursor: pointer;
  border-color: #F0E6F6;
  background: #F0E6F6;
  color: #010544;
  font-weight: 700;
}

.history-empty {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.results-section {
  min-height: 240px;
  margin-top: 18px;
}

.search-skeleton {
  padding: 18px;
  border-radius: 8px;
  background: #fff;
}

.result-count {
  margin-bottom: 14px;
  color: #010544;
  font-size: 16px;
  font-weight: 800;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

@media (min-width: 768px) {
  .product-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }
}

@media (min-width: 1024px) {
  .product-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (min-width: 1280px) {
  .product-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .search-page {
    padding: 14px 12px 32px;
  }

  .search-panel {
    align-items: stretch;
    flex-direction: column;
    padding: 14px;
  }

  .search-button {
    width: 100%;
  }
}
</style>
