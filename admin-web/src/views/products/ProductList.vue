<template>
  <div>
    <el-card class="filter-card">
      <el-form inline>
        <el-form-item label="搜索">
          <el-input v-model="query.keyword" placeholder="商品标题" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="query.category" clearable placeholder="全部">
            <el-option v-for="category in categories" :key="category.id" :label="category.name" :value="category.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable placeholder="全部">
            <el-option label="在售" value="on_sale" />
            <el-option label="已预订" value="reserved" />
            <el-option label="已售出" value="sold" />
            <el-option label="已下架" value="off_shelf" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button type="danger" :disabled="!canWrite || selectedIds.length === 0" @click="showBatchDialog = true">
            批量下架
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card>
      <el-table :data="products" v-loading="loading" stripe @selection-change="handleSelection">
        <el-table-column type="selection" width="50" />
        <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
        <el-table-column prop="price" label="价格" width="100">
          <template #default="{ row }">¥{{ row.price }}</template>
        </el-table-column>
        <el-table-column label="分类" width="110">
          <template #default="{ row }">{{ categoryMap[row.category] || row.category }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="viewCount" label="浏览" width="80" />
        <el-table-column prop="reportCount" label="举报" width="80" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="$router.push(`/products/${row._id}`)">详情</el-button>
            <el-button
              v-if="canWrite && row.status !== 'off_shelf'"
              type="danger"
              link
              @click="openRemoveDialog(row)"
            >
              下架
            </el-button>
            <el-button
              v-if="canWrite && row.status === 'off_shelf'"
              type="success"
              link
              @click="handleRestore(row)"
            >
              恢复
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="currentPage"
        class="pagination"
        background
        layout="total, prev, pager, next"
        :total="total"
        :page-size="query.pageSize"
        @current-change="handlePageChange"
      />
    </el-card>

    <el-dialog v-model="showRemoveDialog" title="强制下架" width="420px">
      <div class="dialog-title">商品：{{ currentProduct?.title }}</div>
      <el-input v-model="removeReason" type="textarea" :rows="3" placeholder="下架原因（必填）" />
      <template #footer>
        <el-button @click="showRemoveDialog = false">取消</el-button>
        <el-button type="danger" :disabled="!removeReason.trim()" @click="handleRemove">确认下架</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showBatchDialog" title="批量下架" width="420px">
      <p>将下架 {{ selectedIds.length }} 件商品</p>
      <el-input v-model="batchReason" type="textarea" :rows="3" placeholder="下架原因（必填）" />
      <template #footer>
        <el-button @click="showBatchDialog = false">取消</el-button>
        <el-button type="danger" :disabled="!batchReason.trim()" @click="handleBatchRemove">确认下架</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getProductList, removeProduct, restoreProduct, batchRemoveProducts } from '../../api/products'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const categories = [
  { id: 'textbook', name: '教材书籍' },
  { id: 'electronics', name: '电子产品' },
  { id: 'clothing', name: '服饰鞋包' },
  { id: 'daily', name: '生活用品' },
  { id: 'food', name: '食品零食' },
  { id: 'stationery', name: '文具办公' },
  { id: 'sports', name: '运动户外' },
  { id: 'other', name: '其他' }
]

const categoryMap = Object.fromEntries(categories.map(item => [item.id, item.name]))
const loading = ref(false)
const products = ref([])
const total = ref(0)
const currentPage = ref(1)
const selectedIds = ref([])
const showRemoveDialog = ref(false)
const showBatchDialog = ref(false)
const currentProduct = ref(null)
const removeReason = ref('')
const batchReason = ref('')
const query = reactive({ keyword: '', category: '', status: '', pageSize: 20 })

const canWrite = computed(() => ['super_admin', 'content_moderator'].includes(authStore.role))

const statusText = status => ({
  on_sale: '在售',
  reserved: '已预订',
  sold: '已售出',
  off_shelf: '已下架'
}[status] || status)

const statusType = status => ({
  on_sale: 'success',
  reserved: 'warning',
  sold: 'info',
  off_shelf: 'danger'
}[status] || '')

async function fetchData() {
  loading.value = true
  try {
    const res = await getProductList({ ...query, page: currentPage.value - 1 })
    products.value = res.list || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
  fetchData()
}

function handleSelection(rows) {
  selectedIds.value = rows.map(row => row._id)
}

function handlePageChange(page) {
  currentPage.value = page
  fetchData()
}

function openRemoveDialog(row) {
  currentProduct.value = row
  removeReason.value = ''
  showRemoveDialog.value = true
}

async function handleRemove() {
  try {
    await removeProduct(currentProduct.value._id, removeReason.value)
    ElMessage.success('已下架')
    showRemoveDialog.value = false
    fetchData()
  } catch (err) { /* 错误已在 request.js 中处理 */ }
}

async function handleRestore(row) {
  try {
    await ElMessageBox.confirm('确定恢复该商品上架？', '提示')
    await restoreProduct(row._id)
    ElMessage.success('已恢复上架')
    fetchData()
  } catch (err) { /* 取消或错误 */ }
}

async function handleBatchRemove() {
  try {
    await batchRemoveProducts(selectedIds.value, batchReason.value)
    ElMessage.success('已批量下架')
    showBatchDialog.value = false
    batchReason.value = ''
    selectedIds.value = []
    fetchData()
  } catch (err) { /* 错误已在 request.js 中处理 */ }
}

onMounted(fetchData)
</script>

<style scoped>
.filter-card {
  margin-bottom: 16px;
}

.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}

.dialog-title {
  margin-bottom: 12px;
  color: #666;
}
</style>
