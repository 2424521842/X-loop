<template>
  <section class="my-products-page">
    <div class="page-head">
      <div>
        <h1>我的发布</h1>
        <p>管理已发布商品的状态和详情。</p>
      </div>
      <el-button type="primary" @click="router.push('/publish')">发布新商品</el-button>
    </div>

    <el-tabs v-model="activeStatus" class="status-tabs">
      <el-tab-pane
        v-for="tab in statusTabs"
        :key="tab.value"
        :label="tab.label"
        :name="tab.value"
      />
    </el-tabs>

    <el-skeleton
      v-if="loading"
      class="list-skeleton"
      :rows="6"
      animated
    />

    <EmptyState
      v-else-if="filteredProducts.length === 0"
      text="暂无商品"
    />

    <div v-else class="product-list">
      <div
        v-for="item in filteredProducts"
        :key="getProductId(item)"
        class="product-row"
      >
        <div class="row-thumb">
          <img
            v-if="getCoverImage(item)"
            :src="getCoverImage(item)"
            :alt="item.title || '商品图片'"
            loading="lazy"
          >
          <span v-else>X</span>
        </div>

        <div class="row-main">
          <h2>{{ item.title || '未命名商品' }}</h2>
          <div class="row-meta">
            <span class="price">{{ formatPrice(item.price) }}</span>
            <el-tag :type="getStatusTagType(item.status)" effect="light">
              {{ PRODUCT_STATUS_MAP[item.status] || item.status }}
            </el-tag>
            <span>{{ formatTime(item.createdAt || item.createTime) }}</span>
          </div>
        </div>

        <el-dropdown
          trigger="click"
          @command="(command) => handleRowCommand(command, item)"
        >
          <el-button>操作</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="edit">编辑</el-dropdown-item>
              <el-dropdown-item
                v-if="item.status === 'off_shelf'"
                command="on_sale"
              >
                上架
              </el-dropdown-item>
              <el-dropdown-item
                v-if="item.status === 'on_sale'"
                command="off_shelf"
              >
                下架
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <el-dialog
      v-model="editVisible"
      title="编辑商品"
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
        <el-form-item label="商品标题" prop="title">
          <el-input
            v-model.trim="editForm.title"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="商品描述" prop="description">
          <el-input
            v-model.trim="editForm.description"
            type="textarea"
            :rows="5"
            maxlength="2000"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="价格" prop="price">
          <el-input-number
            v-model="editForm.price"
            class="full-width"
            :min="0"
            :precision="2"
            :step="1"
          />
        </el-form-item>

        <el-form-item label="分类" prop="category">
          <el-select
            v-model="editForm.category"
            class="full-width"
            placeholder="请选择分类"
          >
            <el-option
              v-for="category in CATEGORIES"
              :key="category.id"
              :label="category.name"
              :value="category.name"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="商品图片">
          <ImageUploader v-model="editForm.images" folder="products" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="handleEditSubmit"
        >
          保存
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
import { CATEGORIES, PRODUCT_STATUS_MAP, formatPrice, formatTime } from '../utils/format'

const router = useRouter()

const products = ref([])
const loading = ref(false)
const saving = ref(false)
const activeStatus = ref('all')
const editVisible = ref(false)
const editFormRef = ref(null)
const editingId = ref('')

const editForm = reactive({
  title: '',
  description: '',
  price: 0,
  category: '',
  images: []
})

const statusTabs = [
  { label: '全部', value: 'all' },
  { label: PRODUCT_STATUS_MAP.on_sale, value: 'on_sale' },
  { label: '预订中', value: 'reserved' },
  { label: PRODUCT_STATUS_MAP.sold, value: 'sold' },
  { label: PRODUCT_STATUS_MAP.off_shelf, value: 'off_shelf' }
]

const filteredProducts = computed(() => {
  if (activeStatus.value === 'all') return products.value
  return products.value.filter((item) => item.status === activeStatus.value)
})

function validatePrice(rule, value, callback) {
  const price = Number(value)
  if (value === '' || value === null || value === undefined || Number.isNaN(price)) {
    callback(new Error('请输入价格'))
    return
  }
  if (price < 0) {
    callback(new Error('价格不能小于 0'))
    return
  }
  callback()
}

const rules = {
  title: [{ required: true, message: '请输入商品标题', trigger: 'blur' }],
  price: [{ validator: validatePrice, trigger: 'change' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }]
}

function getProductId(product) {
  return product?._id || product?.id || ''
}

function getCoverImage(product) {
  return Array.isArray(product?.images) ? product.images[0] || '' : ''
}

function getStatusTagType(status) {
  if (status === 'on_sale') return 'success'
  if (status === 'reserved') return 'warning'
  return 'info'
}

function replaceProduct(id, updatedProduct) {
  products.value = products.value.map((item) => {
    return getProductId(item) === id ? { ...item, ...updatedProduct } : item
  })
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

async function handleRowCommand(command, item) {
  if (command === 'edit') {
    openEdit(item)
    return
  }
  if (command === 'on_sale' || command === 'off_shelf') {
    await updateStatus(item, command)
  }
}

function openEdit(item) {
  editingId.value = getProductId(item)
  editForm.title = item.title || ''
  editForm.description = item.description || ''
  editForm.price = Number(item.price || 0)
  editForm.category = item.category || ''
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
  ElMessage.success(status === 'on_sale' ? '已上架' : '已下架')
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
    ElMessage.success('已保存')
    editVisible.value = false
  } finally {
    saving.value = false
  }
}

onMounted(loadProducts)
</script>

<style scoped lang="scss">
.my-products-page {
  width: min(980px, 100%);
  margin: 0 auto;
  padding: 28px 16px 48px;
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.page-head h1 {
  margin: 0 0 8px;
  color: var(--color-dark);
  font-size: 26px;
}

.page-head p {
  margin: 0;
  color: var(--color-text-secondary);
}

.status-tabs {
  margin-bottom: 12px;
}

.list-skeleton {
  padding: 18px;
  border-radius: 8px;
  background: #fff;
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.product-row {
  display: grid;
  grid-template-columns: 60px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 14px;
  border-radius: 8px;
  background: #fff;
  box-shadow: var(--shadow-card);
}

.row-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  overflow: hidden;
  border-radius: 8px;
  background: var(--color-tag-bg);
  color: var(--color-primary);
  font-weight: 800;
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

.full-width {
  width: 100%;
}

@media (max-width: 640px) {
  .my-products-page {
    padding: 20px 12px 36px;
  }

  .page-head {
    align-items: stretch;
    flex-direction: column;
  }

  .product-row {
    grid-template-columns: 60px minmax(0, 1fr);
  }

  .product-row :deep(.el-dropdown) {
    grid-column: 1 / -1;
    justify-self: end;
  }
}
</style>
