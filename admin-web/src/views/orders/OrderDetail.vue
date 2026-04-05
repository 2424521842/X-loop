<template>
  <div v-loading="loading">
    <el-page-header @back="$router.back()" content="订单详情" class="page-header" />

    <el-row :gutter="16">
      <el-col :xs="24" :xl="16">
        <el-card class="card-gap">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="订单号">{{ order._id }}</el-descriptions-item>
            <el-descriptions-item label="价格">¥{{ order.price }}</el-descriptions-item>
            <el-descriptions-item label="状态"><el-tag>{{ order.status }}</el-tag></el-descriptions-item>
            <el-descriptions-item label="纠纷">
              <el-tag v-if="order.disputeStatus === 'open'" type="danger">纠纷中</el-tag>
              <el-tag v-else-if="order.disputeStatus === 'resolved'" type="info">已解决</el-tag>
              <span v-else>无</span>
            </el-descriptions-item>
            <el-descriptions-item v-if="order.disputeNote" label="纠纷备注" :span="2">
              {{ order.disputeNote }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card v-if="order.product" header="商品信息" class="card-gap">
          <p>{{ order.product.title }} - ¥{{ order.product.price }}</p>
          <div v-if="order.product.images" class="image-list">
            <el-image
              v-for="(image, index) in order.product.images"
              :key="index"
              :src="image"
              class="product-image"
              fit="cover"
            />
          </div>
        </el-card>

        <el-card v-if="canWrite">
          <el-button
            v-if="!order.disputeStatus || order.disputeStatus === 'none'"
            type="warning"
            @click="showInterveneDialog = true"
          >
            标记纠纷
          </el-button>
          <template v-if="order.disputeStatus === 'open'">
            <el-button type="danger" @click="openResolve('force_refund')">强制退款</el-button>
            <el-button type="success" @click="openResolve('force_complete')">强制完成</el-button>
          </template>
        </el-card>
      </el-col>

      <el-col :xs="24" :xl="8">
        <el-card header="买家" class="card-gap">
          <p>{{ order.buyer?.nickName || '-' }}</p>
        </el-card>
        <el-card header="卖家" class="card-gap">
          <p>{{ order.seller?.nickName || '-' }}</p>
        </el-card>
        <el-card header="聊天记录">
          <el-empty v-if="!order.messages || order.messages.length === 0" description="无聊天记录" />
          <div class="chat-messages">
            <div v-for="message in order.messages" :key="message._id" class="chat-msg">
              <span class="chat-sender">{{ message.fromOpenid === order.buyerOpenid ? '买家' : '卖家' }}:</span>
              <span>{{ message.content }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="showInterveneDialog" title="标记纠纷" width="420px">
      <el-input v-model="interveneNote" type="textarea" :rows="3" placeholder="备注说明" />
      <template #footer>
        <el-button @click="showInterveneDialog = false">取消</el-button>
        <el-button type="warning" @click="handleIntervene">确认标记</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showResolveDialog" title="纠纷裁决" width="420px">
      <p>操作：{{ resolveType === 'force_refund' ? '强制退款' : '强制完成' }}</p>
      <el-input v-model="resolveNote" type="textarea" :rows="3" placeholder="裁决说明（必填）" />
      <template #footer>
        <el-button @click="showResolveDialog = false">取消</el-button>
        <el-button type="primary" :disabled="!resolveNote.trim()" @click="handleResolve">确认裁决</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getOrderDetail, interveneOrder, resolveOrder } from '../../api/orders'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const authStore = useAuthStore()
const canWrite = computed(() => ['super_admin', 'customer_service'].includes(authStore.role))
const loading = ref(true)
const order = ref({})
const showInterveneDialog = ref(false)
const interveneNote = ref('')
const showResolveDialog = ref(false)
const resolveType = ref('')
const resolveNote = ref('')

async function fetchData() {
  loading.value = true
  try {
    order.value = await getOrderDetail(route.params.id)
  } finally {
    loading.value = false
  }
}

async function handleIntervene() {
  try {
    await interveneOrder(route.params.id, interveneNote.value)
    ElMessage.success('已标记纠纷')
    showInterveneDialog.value = false
    interveneNote.value = ''
    fetchData()
  } catch (err) { /* 错误已在 request.js 中处理 */ }
}

function openResolve(type) {
  resolveType.value = type
  resolveNote.value = ''
  showResolveDialog.value = true
}

async function handleResolve() {
  try {
    await resolveOrder(route.params.id, resolveType.value, resolveNote.value)
    ElMessage.success('已裁决')
    showResolveDialog.value = false
    resolveNote.value = ''
    fetchData()
  } catch (err) { /* 错误已在 request.js 中处理 */ }
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
  margin-top: 8px;
}

.product-image {
  width: 80px;
  height: 80px;
}

.chat-messages {
  max-height: 400px;
  overflow-y: auto;
}

.chat-msg {
  margin-bottom: 8px;
  font-size: 13px;
}

.chat-sender {
  font-weight: bold;
  margin-right: 4px;
}
</style>
