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

    <div class="card-body">
      <h3 class="card-title">{{ product.title || '未命名商品' }}</h3>
      <span class="card-meta">{{ subMeta }}</span>
      <div class="card-footer">
        <span class="card-price">¥{{ formatPrice(product.price) }}</span>
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
  const category = props.product?.category || ''
  const match = CATEGORIES.find((item) => item.id === category || item.name === category)
  return match?.name || category || '其他'
})

const campusLabel = computed(() => {
  const campus = props.product?.campus
  if (campus === 'sip') return 'SIP 校区'
  if (campus === 'tc') return 'TC 校区'
  return ''
})

const subMeta = computed(() => campusLabel.value || categoryLabel.value)

function handleOpen() {
  if (!props.link || !productId.value) return
  router.push(`/product/${productId.value}`)
}
</script>

<style scoped lang="scss">
.product-card {
  overflow: hidden;
  width: 100%;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 20px rgba(1, 5, 68, 0.03);
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
  background: #F0E6F6;
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
  color: #010544;
  font-size: 18px;
  font-weight: 800;
}

.card-body {
  padding: 10px 12px 12px;
}

.card-title {
  display: block;
  margin: 0 0 4px;
  overflow: hidden;
  color: #1b1b1e;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta {
  display: block;
  margin-bottom: 8px;
  color: #464650;
  font-size: 11px;
}

.card-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.card-price {
  color: #ff4d4f;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.5px;
}

@media (min-width: 768px) {
  .card-title {
    font-size: 15px;
  }

  .card-price {
    font-size: 19px;
  }
}
</style>
