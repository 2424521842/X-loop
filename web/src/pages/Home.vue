<template>
  <section class="home-page">
    <div class="hero-bar">
      <h1>🔁 X-Loop 校园闲置</h1>
      <el-input
        v-model.trim="keyword"
        class="search-input"
        placeholder="搜索教材、电子产品、生活用品"
        clearable
        @keyup.enter="handleSearch"
      >
        <template #prefix>
          <span class="search-icon" aria-hidden="true">⌕</span>
        </template>
      </el-input>
    </div>

    <nav class="category-tabs" aria-label="商品分类">
      <button
        v-for="category in categoryTabs"
        :key="category"
        class="category-tab"
        :class="{ active: selectedCategory === category }"
        type="button"
        @click="handleCategoryChange(category)"
      >
        {{ category }}
      </button>
    </nav>

    <section
      v-infinite-scroll="loadMore"
      class="products-section"
      :infinite-scroll-disabled="scrollDisabled"
      :infinite-scroll-immediate="false"
      infinite-scroll-distance="120"
    >
      <el-skeleton
        v-if="initialLoading"
        class="home-skeleton"
        :rows="8"
        animated
      />

      <template v-else>
        <div v-if="products.length" class="product-grid">
          <ProductCard
            v-for="item in products"
            :key="item.id || item._id"
            :product="item"
          />
        </div>

        <EmptyState
          v-else
          text="暂无商品"
        />

        <div v-if="loading && products.length" class="load-more">加载中...</div>
        <div v-else-if="!finished && products.length" class="load-more">继续下滑查看更多</div>
      </template>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import EmptyState from '../components/EmptyState.vue'
import ProductCard from '../components/ProductCard.vue'
import { getProducts } from '../api/products'
import { CATEGORIES } from '../utils/format'

const PAGE_SIZE = 20

const router = useRouter()
const keyword = ref('')
const selectedCategory = ref('全部')
const products = ref([])
const page = ref(0)
const loading = ref(false)
const finished = ref(false)

const categoryTabs = computed(() => ['全部', ...CATEGORIES.map((item) => item.name)])
const initialLoading = computed(() => loading.value && products.value.length === 0)
const scrollDisabled = computed(() => loading.value || finished.value)

function normalizeItems(result) {
  if (Array.isArray(result)) return result
  return Array.isArray(result?.items) ? result.items : []
}

async function loadProducts(reset = false) {
  if (loading.value) return

  loading.value = true
  try {
    const result = await getProducts({
      page: page.value,
      pageSize: PAGE_SIZE,
      category: selectedCategory.value === '全部' ? '' : selectedCategory.value
    })
    const items = normalizeItems(result)
    products.value = reset ? items : [...products.value, ...items]
    finished.value = items.length < PAGE_SIZE
    page.value += 1
  } catch (error) {
    finished.value = true
  } finally {
    loading.value = false
  }
}

function resetAndLoad() {
  products.value = []
  page.value = 0
  finished.value = false
  loadProducts(true)
}

function loadMore() {
  if (scrollDisabled.value) return
  loadProducts(false)
}

function handleCategoryChange(category) {
  if (selectedCategory.value === category) return
  selectedCategory.value = category
  resetAndLoad()
}

function handleSearch() {
  const q = keyword.value.trim()
  if (!q) return
  router.push({
    path: '/search',
    query: { q }
  })
}

onMounted(() => {
  resetAndLoad()
})
</script>

<style scoped lang="scss">
.home-page {
  width: min(1280px, 100%);
  margin: 0 auto;
  padding: 20px 16px 40px;
}

.hero-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 80px;
  padding: 0 24px;
  border-radius: 8px;
  background: var(--gradient-brand);
  color: #fff;
}

.hero-bar h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 0;
}

.search-input {
  width: min(360px, 46vw);
}

.search-icon {
  color: var(--color-text-secondary);
  font-size: 16px;
}

.category-tabs {
  display: flex;
  gap: 10px;
  margin: 18px 0;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
  white-space: nowrap;
}

.category-tabs::-webkit-scrollbar {
  display: none;
}

.category-tab {
  flex: 0 0 auto;
  min-height: 34px;
  padding: 0 14px;
  border: 0;
  border-radius: 8px;
  background: #fff;
  color: var(--color-text);
  cursor: pointer;
  font-weight: 700;
}

.category-tab.active,
.category-tab:hover {
  background: var(--color-tag-bg);
  color: var(--color-primary);
}

.products-section {
  min-height: 240px;
}

.home-skeleton {
  padding: 18px;
  border-radius: 8px;
  background: #fff;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.load-more {
  padding: 20px 0 4px;
  color: var(--color-text-secondary);
  font-size: 14px;
  text-align: center;
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
  .home-page {
    padding: 14px 12px 32px;
  }

  .hero-bar {
    align-items: stretch;
    flex-direction: column;
    justify-content: center;
    gap: 10px;
    height: auto;
    min-height: 112px;
    padding: 14px;
  }

  .hero-bar h1 {
    font-size: 21px;
  }

  .search-input {
    width: 100%;
  }
}
</style>
