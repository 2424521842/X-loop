<template>
  <section class="my-products-page mobile-page">
    <div class="mobile-content">
      <div class="page-actions">
        <p>{{ t('myProducts.intro') }}</p>
        <button class="publish-shortcut" type="button" @click="router.push('/publish')">{{ t('myProducts.publishNew') }}</button>
      </div>

      <div class="status-tabs">
        <button
          v-for="tab in statusTabs"
          :key="tab.value"
          class="status-chip"
          :class="{ active: activeStatus === tab.value }"
          type="button"
          @click="activeStatus = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <el-skeleton
        v-if="loading"
        class="list-skeleton"
        :rows="6"
        animated
      />

      <EmptyState
        v-else-if="filteredProducts.length === 0"
        :text="t('myProducts.empty')"
      />

      <div v-else class="product-list">
        <article
          v-for="item in filteredProducts"
          :key="getProductId(item)"
          class="product-row"
        >
          <button class="row-thumb" type="button" @click="router.push(`/product/${getProductId(item)}`)">
            <img
              v-if="getCoverImage(item)"
              :src="getCoverImage(item)"
              :alt="item.title || t('common.productImage')"
              loading="lazy"
            >
            <span v-else>X</span>
          </button>

          <div class="row-main">
            <h2>{{ item.title || t('common.unnamedProduct') }}</h2>
            <div class="row-meta">
              <span class="price">{{ formatPrice(item.price) }}</span>
              <span class="status-pill">{{ productStatusText(item.status) }}</span>
              <span>{{ formatTime(item.createdAt || item.createTime, t) }}</span>
            </div>
          </div>

          <div class="row-actions">
            <button type="button" @click="openEdit(item)">{{ t('common.edit') }}</button>
            <button
              v-if="item.status === 'off_shelf'"
              type="button"
              @click="updateStatus(item, 'on_sale')"
            >
              {{ t('myProducts.putOnShelf') }}
            </button>
            <button
              v-if="item.status === 'on_sale'"
              type="button"
              @click="updateStatus(item, 'off_shelf')"
            >
              {{ t('myProducts.takeOffShelf') }}
            </button>
          </div>
        </article>
      </div>
    </div>

    <el-dialog
      v-model="editVisible"
      :title="t('myProducts.editTitle')"
      width="min(680px, 92vw)"
      destroy-on-close
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="rules"
        label-position="top"
        @submit.prevent
      >
        <el-form-item :label="t('myProducts.titleLabel')" prop="title">
          <el-input
            v-model.trim="editForm.title"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>

        <el-form-item :label="t('myProducts.descriptionLabel')" prop="description">
          <el-input
            v-model.trim="editForm.description"
            type="textarea"
            :rows="5"
            maxlength="2000"
            show-word-limit
          />
        </el-form-item>

        <el-form-item :label="t('myProducts.priceLabel')" prop="price">
          <el-input-number
            v-model="editForm.price"
            class="full-width"
            :min="0"
            :precision="2"
            :step="1"
          />
        </el-form-item>

        <el-form-item :label="t('myProducts.categoryLabel')" prop="category">
          <el-select
            v-model="editForm.category"
            class="full-width"
            :placeholder="t('myProducts.categoryPlaceholder')"
          >
            <el-option
              v-for="category in categories"
              :key="category.id"
              :label="category.label"
              :value="category.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('myProducts.imagesLabel')">
          <ImageUploader v-model="editForm.images" folder="products" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="handleEditSubmit"
        >
          {{ t('common.save') }}
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import EmptyState from '../components/EmptyState.vue'
import ImageUploader from '../components/ImageUploader.vue'
import { getMyProducts, updateProduct } from '../api/products'
import { formatPrice, formatTime, getCategoryValue, getLocalizedCategories, getProductStatusText } from '../utils/format'
import { useI18n } from '../utils/i18n'

const router = useRouter()
const { t } = useI18n()

const products = ref([])
const loading = ref(false)
const saving = ref(false)
const activeStatus = ref('all')
const editVisible = ref(false)
const editFormRef = ref(null)
const editingId = ref('')
const categories = computed(() => getLocalizedCategories(t))

const editForm = reactive({
  title: '',
  description: '',
  price: 0,
  category: '',
  images: []
})

const statusTabs = computed(() => [
  { label: t('common.all'), value: 'all' },
  { label: getProductStatusText('on_sale', t), value: 'on_sale' },
  { label: t('myProducts.reserved'), value: 'reserved' },
  { label: getProductStatusText('sold', t), value: 'sold' },
  { label: getProductStatusText('off_shelf', t), value: 'off_shelf' }
])

const filteredProducts = computed(() => {
  if (activeStatus.value === 'all') return products.value
  return products.value.filter((item) => item.status === activeStatus.value)
})

function validatePrice(rule, value, callback) {
  const price = Number(value)
  if (value === '' || value === null || value === undefined || Number.isNaN(price)) {
    callback(new Error(t('myProducts.priceRequired')))
    return
  }
  if (price < 0) {
    callback(new Error(t('myProducts.priceMin')))
    return
  }
  callback()
}

const rules = computed(() => ({
  title: [{ required: true, message: t('myProducts.titleRequired'), trigger: 'blur' }],
  price: [{ validator: validatePrice, trigger: 'change' }],
  category: [{ required: true, message: t('myProducts.categoryRequired'), trigger: 'change' }]
}))

function getProductId(product) {
  return product?._id || product?.id || ''
}

function getCoverImage(product) {
  return Array.isArray(product?.images) ? product.images[0] || '' : ''
}

function replaceProduct(id, updatedProduct) {
  products.value = products.value.map((item) => {
    return getProductId(item) === id ? { ...item, ...updatedProduct } : item
  })
}

function productStatusText(status) {
  return getProductStatusText(status, t) || status
}

async function loadProducts() {
  loading.value = true
  try {
    const result = await getMyProducts()
    products.value = Array.isArray(result?.items) ? result.items : []
  } catch (error) {
    products.value = []
  } finally {
    loading.value = false
  }
}

function openEdit(item) {
  editingId.value = getProductId(item)
  editForm.title = item.title || ''
  editForm.description = item.description || ''
  editForm.price = Number(item.price || 0)
  editForm.category = getCategoryValue(item.category)
  editForm.images = Array.isArray(item.images) ? [...item.images] : []
  editVisible.value = true
  nextTick(() => {
    editFormRef.value?.clearValidate()
  })
}

async function updateStatus(item, status) {
  const id = getProductId(item)
  if (!id) return

  const updated = await updateProduct(id, { status })
  replaceProduct(id, updated)
  ElMessage.success(status === 'on_sale' ? t('myProducts.onShelfSuccess') : t('myProducts.offShelfSuccess'))
}

async function handleEditSubmit() {
  await editFormRef.value.validate()
  if (!editingId.value) return

  saving.value = true
  try {
    const updated = await updateProduct(editingId.value, {
      title: editForm.title,
      description: editForm.description,
      price: editForm.price,
      category: editForm.category,
      images: editForm.images
    })
    replaceProduct(editingId.value, updated)
    ElMessage.success(t('myProducts.saved'))
    editVisible.value = false
  } finally {
    saving.value = false
  }
}

onMounted(loadProducts)
</script>

<style scoped lang="scss">
.my-products-page {
  margin: 0 auto;
  background: #F5F3F7;
}

.page-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.page-actions p {
  margin: 0;
  color: #777681;
  font-size: 13px;
}

.publish-shortcut {
  flex: 0 0 auto;
  min-height: 34px;
  padding: 0 16px;
  border: 0;
  border-radius: 17px;
  background: var(--gradient-brand);
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
}

.status-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  margin: 0 -14px 14px;
  padding: 0 14px 2px;
  scrollbar-width: none;
  white-space: nowrap;
}

.status-tabs::-webkit-scrollbar {
  display: none;
}

.status-chip {
  flex: 0 0 auto;
  min-height: 32px;
  padding: 0 14px;
  border: 0;
  border-radius: 16px;
  background: #fff;
  color: #777681;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}

.status-chip.active {
  background: #F0E6F6;
  color: #CE57C1;
}

.list-skeleton {
  padding: 18px;
  border-radius: 16px;
  background: #fff;
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.product-row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding: 12px;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--shadow-card);
}

.row-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  overflow: hidden;
  border: 0;
  border-radius: 12px;
  background: var(--color-tag-bg);
  color: var(--color-primary);
  cursor: pointer;
  font-weight: 800;
  padding: 0;
}

.row-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.row-main {
  min-width: 0;
}

.row-main h2 {
  margin: 0 0 8px;
  overflow: hidden;
  color: var(--color-text);
  font-size: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.status-pill {
  padding: 3px 9px;
  border-radius: 999px;
  background: #F0E6F6;
  color: #CE57C1;
  font-size: 12px;
  font-weight: 700;
}

.row-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.row-actions button {
  min-height: 32px;
  padding: 0 14px;
  border: 1px solid #ddd;
  border-radius: 16px;
  background: #fff;
  color: #464650;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}

.full-width {
  width: 100%;
}

@media (max-width: 640px) {
  .page-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
