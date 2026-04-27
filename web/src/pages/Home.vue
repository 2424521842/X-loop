<template>
  <section class="home-page mobile-page">
    <header class="hero-section">
      <div class="hero-decoration" aria-hidden="true"></div>
      <div class="hero-content">
        <h1 class="hero-title">
          <span class="hero-title-text">校园好物，</span>
          <span class="hero-title-accent">即刻流转</span>
        </h1>
        <p class="hero-subtitle">发现西浦学子正在交易的优质闲置</p>

        <button
          class="search-bar"
          type="button"
          @click="goSearch"
        >
          <span class="search-icon" aria-hidden="true">⌕</span>
          <span class="search-placeholder">搜索您需要的物品</span>
        </button>
      </div>
    </header>

    <section class="category-section" aria-label="商品分类">
      <div class="category-header">
        <span class="category-title">热门分类</span>
        <button class="category-more" type="button" @click="goSearch">查看全部</button>
      </div>
      <div class="category-scroll">
        <button
          v-for="category in categoryTabs"
          :key="category"
          class="category-chip"
          :class="{ active: selectedCategory === category }"
          type="button"
          @click="handleCategoryChange(category)"
        >
          {{ category }}
        </button>
      </div>
    </section>

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
          text="暂无商品，快去发布吧~"
        />

        <div v-if="loading && products.length" class="load-more">加载中...</div>
        <div v-else-if="finished && products.length" class="load-more">没有更多了</div>
      </template>
    </section>

    <button
      class="fab-btn"
      type="button"
      aria-label="发布商品"
      @click="goPublish"
    >
      <span class="fab-icon">+</span>
    </button>
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

function goSearch() {
  router.push('/search')
}

function goPublish() {
  router.push('/publish')
}

onMounted(() => {
  resetAndLoad()
})
</script>

<style scoped lang="scss">
.home-page {
  position: relative;
  width: min(var(--mobile-shell-max), 100%);
  margin: 0 auto;
  padding: 0 0 32px;
  background: #F5F3F7;
}

.hero-section {
  position: relative;
  padding: 24px 20px 32px;
  background: linear-gradient(to bottom, #fbf8fc, #f5f3f7);
  overflow: hidden;
}

.hero-decoration {
  position: absolute;
  top: -40px;
  right: -40px;
  width: 150px;
  height: 150px;
  background: rgba(203, 85, 191, 0.05);
  border-radius: 50%;
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 2;
}

.hero-title {
  margin: 0 0 6px;
  font-size: 26px;
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: 0;
}

.hero-title-text {
  color: #0d144e;
}

.hero-title-accent {
  color: #cb55bf;
}

.hero-subtitle {
  margin: 0 0 20px;
  color: #464650;
  font-size: 13px;
  font-weight: 500;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 14px;
  border: 0;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 20px rgba(1, 5, 68, 0.04);
  cursor: pointer;
  text-align: left;
}

.search-icon {
  color: #777681;
  font-size: 16px;
}

.search-placeholder {
  flex: 1;
  color: #777681;
  font-size: 14px;
  font-weight: 500;
}

.category-section {
  margin: 0 0 20px;
}

.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  margin-bottom: 12px;
}

.category-title {
  color: #464650;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
}

.category-more {
  padding: 0;
  border: 0;
  background: transparent;
  color: #cb55bf;
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
}

.category-scroll {
  display: flex;
  gap: 10px;
  padding: 0 20px;
  overflow-x: auto;
  scrollbar-width: none;
  white-space: nowrap;
}

.category-scroll::-webkit-scrollbar {
  display: none;
}

.category-chip {
  flex: 0 0 auto;
  padding: 8px 18px;
  border: 0;
  border-radius: 8px;
  background: #F0E6F6;
  color: #010544;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  transition: background 0.18s ease, color 0.18s ease;
}

.category-chip.active {
  background: linear-gradient(135deg, #010544, #CE57C1);
  color: #fff;
}

.products-section {
  min-height: 240px;
  padding: 0 15px;
}

.home-skeleton {
  padding: 18px;
  border-radius: 12px;
  background: #fff;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.load-more {
  padding: 24px 0 4px;
  color: #777681;
  font-size: 13px;
  text-align: center;
}

.fab-btn {
  position: fixed;
  right: 20px;
  bottom: 90px;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, #010544, #CE57C1);
  box-shadow: 0 8px 24px rgba(1, 5, 68, 0.25);
  cursor: pointer;
}

.fab-icon {
  color: #fff;
  font-size: 22px;
  font-weight: 300;
  line-height: 1;
}

@media (min-width: 768px) {
  .home-page {
    padding: 0 0 40px;
  }

  .hero-section {
    padding: 40px 32px 48px;
  }

  .hero-title {
    font-size: 36px;
  }

  .hero-subtitle {
    font-size: 15px;
  }

  .products-section {
    padding: 0 20px;
  }

  .product-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .fab-btn {
    width: 56px;
    height: 56px;
    right: 32px;
    bottom: 32px;
  }

  .fab-icon {
    font-size: 26px;
  }
}

@media (min-width: 1024px) {
  .product-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (min-width: 1280px) {
  .product-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
