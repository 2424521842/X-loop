<template>
  <article
    class="product-card"
    :class="[`product-card-${variant}`, { clickable: link && productId }]"
    :tabindex="link && productId ? 0 : undefined"
    @click="handleOpen"
    @keyup.enter="handleOpen"
  >
    <div class="image-wrap">
      <img
        v-if="coverImage"
        :src="coverImage"
        :alt="product.title || t('common.productImage')"
        loading="lazy"
      >
      <div v-else class="image-placeholder">X-Loop</div>
    </div>

    <div class="card-body">
      <h3 class="card-title">{{ product.title || t('common.unnamedProduct') }}</h3>
      <span class="card-meta">{{ subMeta }}</span>
      <div class="card-footer">
        <span class="card-price">{{ formatPrice(product.price) }}</span>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { formatPrice, getCampusLabel, getCategoryName } from '../utils/format'
import { useI18n } from '../utils/i18n'

const props = defineProps({
  product: {
    type: Object,
    required: true
  },
  link: {
    type: Boolean,
    default: true
  },
  variant: {
    type: String,
    default: 'grid',
    validator: (value) => ['grid', 'list'].includes(value)
  }
})

const router = useRouter()
const { t } = useI18n()

const productId = computed(() => props.product?._id || props.product?.id || '')
const coverImage = computed(() => {
  return Array.isArray(props.product?.images) ? props.product.images[0] || '' : ''
})

const categoryLabel = computed(() => {
  return getCategoryName(props.product?.category || '', t)
})

const campusLabel = computed(() => {
  const campus = props.product?.campus
  return campus ? getCampusLabel(campus, t) : ''
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
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 4px 20px rgba(1, 5, 68, 0.04);
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
  padding: 10px 12px 13px;
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
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0;
}

.product-card-list {
  display: flex;
  min-height: 128px;
  border-radius: 16px;
}

.product-card-list .image-wrap {
  flex: 0 0 128px;
  width: 128px;
  aspect-ratio: auto;
}

.product-card-list .card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  padding: 14px;
}

.product-card-list .card-title {
  display: -webkit-box;
  margin-bottom: 8px;
  white-space: normal;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.product-card-list .card-meta {
  align-self: flex-start;
  padding: 3px 10px;
  border-radius: 999px;
  background: #F0E6F6;
  color: #CE57C1;
  font-size: 11px;
}

@media (min-width: 768px) {
  .card-title {
    font-size: 15px;
  }

  .card-price {
    font-size: 19px;
  }

  .product-card-grid {
    border-radius: 18px;
  }
}
</style>
