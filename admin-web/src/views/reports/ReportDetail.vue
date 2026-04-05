<template>
  <div v-loading="loading">
    <el-page-header @back="$router.back()" content="举报详情" class="page-header" />

    <el-row :gutter="16">
      <el-col :xs="24" :xl="16">
        <el-card class="card-gap">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="举报类型">{{ targetTypeText(report.targetType) }}</el-descriptions-item>
            <el-descriptions-item label="原因">{{ report.reason }}</el-descriptions-item>
            <el-descriptions-item label="状态"><el-tag>{{ report.status }}</el-tag></el-descriptions-item>
            <el-descriptions-item label="举报人">{{ report.reporter?.nickName || report.reporterOpenid || '-' }}</el-descriptions-item>
            <el-descriptions-item label="说明" :span="2">{{ report.description || '-' }}</el-descriptions-item>
            <el-descriptions-item v-if="report.handleResult" label="处理结果" :span="2">{{ report.handleResult }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card header="被举报对象" class="card-gap">
          <div v-if="report.targetType === 'product' && report.target">
            <p>商品标题：{{ report.target.title }}</p>
            <p>状态：<el-tag size="small">{{ report.target.status }}</el-tag></p>
            <div v-if="report.target.images" class="image-list">
              <el-image
                v-for="(image, index) in report.target.images"
                :key="index"
                :src="image"
                class="target-image"
                fit="cover"
              />
            </div>
          </div>
          <div v-else-if="report.targetType === 'user' && report.target">
            <p>用户昵称：{{ report.target.nickName }}</p>
            <p>
              状态：
              <el-tag size="small" :type="report.target.status === 'banned' ? 'danger' : 'success'">
                {{ report.target.status }}
              </el-tag>
            </p>
          </div>
          <div v-else>暂无对象详情</div>
        </el-card>

        <el-card v-if="report.status === 'pending' || report.status === 'processing'">
          <el-button v-if="report.status === 'pending'" type="warning" @click="handleClaim">认领</el-button>
          <el-button
            v-if="report.targetType === 'product'"
            type="danger"
            @click="openResolve('remove_product')"
          >
            下架商品
          </el-button>
          <el-button
            v-if="report.targetType === 'user'"
            type="danger"
            @click="openResolve('ban_user')"
          >
            封禁用户
          </el-button>
          <el-button @click="openResolve('reject')">驳回举报</el-button>
        </el-card>
      </el-col>

      <el-col :xs="24" :xl="8">
        <el-card header="同对象其他举报">
          <el-empty v-if="!report.relatedReports || report.relatedReports.length === 0" description="无其他举报" />
          <div v-for="item in report.relatedReports" :key="item._id" class="related-item">
            <div>{{ item.reason }} - {{ item.description || '-' }}</div>
            <el-tag size="small">{{ item.status }}</el-tag>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="showResolveDialog" title="处理举报" width="420px">
      <p>操作：{{ resolveActionText }}</p>
      <el-input v-model="resolveResult" type="textarea" :rows="3" placeholder="处理说明（必填）" />
      <template #footer>
        <el-button @click="showResolveDialog = false">取消</el-button>
        <el-button type="primary" :disabled="!resolveResult.trim()" @click="handleResolve">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getReportDetail, claimReport, resolveReport } from '../../api/reports'

const route = useRoute()
const loading = ref(true)
const report = ref({})
const showResolveDialog = ref(false)
const resolveAction = ref('')
const resolveResult = ref('')

const resolveActionText = computed(() => ({
  remove_product: '下架商品',
  ban_user: '封禁用户',
  reject: '驳回举报'
}[resolveAction.value] || ''))

function targetTypeText(type) {
  return { product: '商品', user: '用户', message: '消息' }[type] || type
}

async function fetchData() {
  loading.value = true
  try {
    report.value = await getReportDetail(route.params.id)
  } finally {
    loading.value = false
  }
}

async function handleClaim() {
  await claimReport(route.params.id)
  ElMessage.success('已认领')
  fetchData()
}

function openResolve(action) {
  resolveAction.value = action
  resolveResult.value = ''
  showResolveDialog.value = true
}

async function handleResolve() {
  await resolveReport(route.params.id, resolveResult.value, resolveAction.value)
  ElMessage.success('已处理')
  showResolveDialog.value = false
  resolveResult.value = ''
  fetchData()
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
  flex-wrap: wrap;
}

.target-image {
  width: 100px;
  height: 100px;
}

.related-item {
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}
</style>
