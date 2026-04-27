<template>
  <article
    class="product-card"
    :class="{ clickable: link && productId }"
    :tabindex="link && productId ? 0 : undefined"
    @click="handleOpen"
    @keyup.enter="handleOpen"
  >
    <div class="image-wrap">
      <img
        v-if="coverImage"
        :src="coverImage"
        :alt="product.title || '商品图片'"
        loading="lazy"
      >
      <div v-else class="image-placeholder">X-Loop</div>
    </div>

    <div class="product-body">
      <h3>{{ product.title || '未命名商品' }}</h3>
      <div class="price">{{ formatPrice(product.price) }}</div>
      <div class="meta-row">
        <span class="tag tag-green">{{ categoryLabel }}</span>
        <span class="views">{{ product.viewCount || 0 }} 浏览</span>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { CATEGORIES, formatPrice } from '../utils/format'

const props = defineProps({
  product: {
    type: Object,
    required: true
  },
  link: {
    type: Boolean,
    default: true
  }
})

const router = useRouter()

const productId = computed(() => props.product?._id || props.product?.id || '')
const coverImage = computed(() => {
  return Array.isArray(props.product?.images) ? props.product.images[0] || '' : ''
})

const categoryLabel = computed(() => {
  const category = props.product?.category || '其他'
  const match = CATEGORIES.find((item) => item.id === category || item.name === category)
  return match?.name || category
})

function handleOpen() {
  if (!props.link || !productId.value) return
  router.push(`/product/${productId.value}`)
}
</script>

<style scoped lang="scss">
.product-card {
  overflow: hidden;
  width: 100%;
  border-radius: 8px;
  background: #fff;
  box-shadow: var(--shadow-card);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.product-card.clickable {
  cursor: pointer;
}

.product-card.clickable:hover,
.product-card.clickable:focus-visible {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(1, 5, 68, 0.12);
  outline: none;
}

.image-wrap {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: var(--color-tag-bg);
}

.image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--color-primary);
  font-size: 18px;
  font-weight: 800;
}

.product-body {
  padding: 12px;
}

h3 {
  display: -webkit-box;
  min-height: 40px;
  margin: 0 0 8px;
  overflow: hidden;
  color: var(--color-text);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.price {
  margin-bottom: 10px;
  font-size: 18px;
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.tag {
  max-width: 70%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.views {
  flex: 0 0 auto;
  color: var(--color-text-secondary);
  font-size: 12px;
}
</style>
