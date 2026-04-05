<template>
  <div v-loading="loading">
    <el-page-header @back="$router.back()" content="用户详情" class="page-header" />

    <el-card class="card-gap">
      <el-descriptions :column="3" border>
        <el-descriptions-item label="昵称">{{ user.nickName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="OpenID">{{ user.openid }}</el-descriptions-item>
        <el-descriptions-item label="信誉分">
          {{ user.credit || 100 }}
          <el-button
            v-if="canWrite"
            type="primary"
            link
            size="small"
            style="margin-left: 8px;"
            @click="showCreditDialog = true"
          >
            调整
          </el-button>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="user.status === 'banned' ? 'danger' : 'success'">
            {{ user.status === 'banned' ? '封禁' : '正常' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="发布商品数">{{ user.productCount || 0 }}</el-descriptions-item>
        <el-descriptions-item label="订单数">{{ user.orderCount || 0 }}</el-descriptions-item>
        <el-descriptions-item label="被举报次数">{{ user.reportCount || 0 }}</el-descriptions-item>
        <el-descriptions-item label="注册时间">{{ formatDate(user.createTime) }}</el-descriptions-item>
        <el-descriptions-item v-if="user.banReason" label="封禁原因" :span="3">{{ user.banReason }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card v-if="canWrite">
      <el-button v-if="user.status !== 'banned'" type="danger" @click="showBanDialog = true">封禁用户</el-button>
      <el-button v-else type="success" @click="handleUnban">解除封禁</el-button>
    </el-card>

    <el-dialog v-model="showBanDialog" title="封禁用户" width="420px">
      <el-input v-model="banReason" type="textarea" :rows="3" placeholder="请输入封禁原因（必填）" />
      <template #footer>
        <el-button @click="showBanDialog = false">取消</el-button>
        <el-button type="danger" :disabled="!banReason.trim()" @click="handleBan">确认封禁</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showCreditDialog" title="调整信誉分" width="420px">
      <el-form label-width="90px">
        <el-form-item label="新信誉分">
          <el-input-number v-model="newCredit" :min="0" :max="200" />
        </el-form-item>
        <el-form-item label="调整原因">
          <el-input v-model="creditReason" type="textarea" :rows="2" placeholder="请输入原因（必填）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreditDialog = false">取消</el-button>
        <el-button type="primary" :disabled="!creditReason.trim()" @click="handleAdjustCredit">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import { getUserDetail, banUser, unbanUser, adjustCredit } from '../../api/users'

const route = useRoute()
const authStore = useAuthStore()
const loading = ref(true)
const user = ref({})
const showBanDialog = ref(false)
const banReason = ref('')
const showCreditDialog = ref(false)
const newCredit = ref(100)
const creditReason = ref('')

const canWrite = computed(() => ['super_admin', 'content_moderator'].includes(authStore.role))

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN')
}

async function fetchData() {
  loading.value = true
  try {
    user.value = await getUserDetail(route.params.openid)
    newCredit.value = user.value.credit || 100
  } finally {
    loading.value = false
  }
}

async function handleBan() {
  await banUser(user.value.openid, banReason.value)
  ElMessage.success('已封禁')
  showBanDialog.value = false
  banReason.value = ''
  fetchData()
}

async function handleUnban() {
  await ElMessageBox.confirm('确定解除该用户的封禁？', '提示')
  await unbanUser(user.value.openid)
  ElMessage.success('已解封')
  fetchData()
}

async function handleAdjustCredit() {
  await adjustCredit(user.value.openid, newCredit.value, creditReason.value)
  ElMessage.success('信誉分已调整')
  showCreditDialog.value = false
  creditReason.value = ''
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
</style>
