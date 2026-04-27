<template>
  <div v-loading="loading">
    <el-page-header @back="$router.back()" content="商品详情" class="page-header" />

    <el-row :gutter="16">
      <el-col :xs="24" :xl="16">
        <el-card class="card-gap">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="标题" :span="2">{{ product.title }}</el-descriptions-item>
            <el-descriptions-item label="价格">¥{{ product.price }}</el-descriptions-item>
            <el-descriptions-item label="分类">{{ categoryMap[product.category] || product.category }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="product.status === 'off_shelf' ? 'danger' : 'success'">
                {{ statusText(product.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="浏览次数">{{ product.viewCount }}</el-descriptions-item>
            <el-descriptions-item label="描述" :span="2">{{ product.description || '-' }}</el-descriptions-item>
            <el-descriptions-item v-if="product.adminNote" label="管理员备注" :span="2">
              <span class="admin-note">{{ product.adminNote }}</span>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card v-if="product.images && product.images.length" class="card-gap">
          <div class="image-list">
            <el-image
              v-for="(image, index) in product.images"
              :key="index"
              :src="image"
              class="product-image"
              fit="cover"
              :preview-src-list="product.images"
            />
          </div>
        </el-card>

        <el-card v-if="canWrite">
          <el-button v-if="product.status !== 'off_shelf'" type="danger" @click="showRemoveDialog = true">强制下架</el-button>
          <el-button v-else type="success" @click="handleRestore">恢复上架</el-button>
        </el-card>
      </el-col>

      <el-col :xs="24" :xl="8">
        <el-card header="卖家信息" class="card-gap">
          <p>昵称：{{ product.seller?.nickName || '-' }}</p>
          <p>信誉分：{{ product.seller?.credit || '-' }}</p>
          <p>
            状态：
            <el-tag size="small" :type="product.seller?.status === 'banned' ? 'danger' : 'success'">
              {{ product.seller?.status === 'banned' ? '封禁' : '正常' }}
            </el-tag>
          </p>
        </el-card>

        <el-card header="举报记录">
          <el-empty v-if="!product.reports || product.reports.length === 0" description="暂无举报" />
          <div v-for="report in product.reports" :key="report.id" class="report-item">
            <div>原因：{{ report.reason }}</div>
            <div class="report-desc">{{ report.description || '-' }}</div>
            <el-tag size="small">{{ report.status }}</el-tag>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="showRemoveDialog" title="强制下架" width="420px">
      <el-input v-model="removeReason" type="textarea" :rows="3" placeholder="下架原因（必填）" />
      <template #footer>
        <el-button @click="showRemoveDialog = false">取消</el-button>
        <el-button type="danger" :disabled="!removeReason.trim()" @click="handleRemove">确认下架</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getProductDetail, removeProduct, restoreProduct } from '../../api/products'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const route = useRoute()
const loading = ref(true)
const product = ref({})
const showRemoveDialog = ref(false)
const removeReason = ref('')

const canWrite = computed(() => ['super_admin', 'content_moderator'].includes(authStore.role))
const categoryMap = {
  textbook: '教材书籍',
  electronics: '电子产品',
  clothing: '服饰鞋包',
  daily: '生活用品',
  food: '食品零食',
  stationery: '文具办公',
  sports: '运动户外',
  other: '其他'
}

const statusText = status => ({
  on_sale: '在售',
  reserved: '已预订',
  sold: '已售出',
  off_shelf: '已下架'
}[status] || status)

async function fetchData() {
  loading.value = true
  try {
    product.value = await getProductDetail(route.params.id)
  } finally {
    loading.value = false
  }
}

async function handleRemove() {
  try {
    await removeProduct(product.value.id, removeReason.value)
    ElMessage.success('已下架')
    showRemoveDialog.value = false
    removeReason.value = ''
    fetchData()
  } catch (err) { /* 错误已在 request.js 中处理 */ }
}

async function handleRestore() {
  try {
    await ElMessageBox.confirm('确定恢复该商品上架？', '提示')
    await restoreProduct(product.value.id)
    ElMessage.success('已恢复上架')
    fetchData()
  } catch (err) { /* 取消或错误 */ }
}

onMounted(fetchData)
</script>

<style scoped>
.page-header {
  margin-bottom: 16px;
}

.card-gap {
  margin-bottom: 16px;
}

.image-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.product-image {
  width: 150px;
  height: 150px;
}

.admin-note {
  color: #f56c6c;
}

.report-item {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.report-desc {
  color: #999;
  font-size: 12px;
  margin: 4px 0 8px;
}
</style>
