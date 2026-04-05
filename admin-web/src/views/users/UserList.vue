<template>
  <div>
    <el-card class="filter-card">
      <el-form inline>
        <el-form-item label="搜索">
          <el-input v-model="query.keyword" placeholder="昵称" clearable @keyup.enter="fetchData" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable placeholder="全部">
            <el-option label="正常" value="active" />
            <el-option label="封禁" value="banned" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card>
      <el-table :data="users" v-loading="loading" stripe>
        <el-table-column prop="nickName" label="昵称" min-width="120" />
        <el-table-column prop="openid" label="OpenID" min-width="220" show-overflow-tooltip />
        <el-table-column prop="credit" label="信誉分" width="90" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'banned' ? 'danger' : 'success'" size="small">
              {{ row.status === 'banned' ? '封禁' : '正常' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="注册时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="$router.push(`/users/${row.openid}`)">详情</el-button>
            <el-button
              v-if="canWrite && row.status !== 'banned'"
              type="danger"
              link
              @click="openBanDialog(row)"
            >
              封禁
            </el-button>
            <el-button
              v-if="canWrite && row.status === 'banned'"
              type="success"
              link
              @click="handleUnban(row)"
            >
              解封
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

    <el-dialog v-model="showBanDialog" title="封禁用户" width="420px">
      <div class="dialog-user">用户：{{ currentUser?.nickName || currentUser?.openid }}</div>
      <el-input v-model="banReason" type="textarea" :rows="3" placeholder="请输入封禁原因（必填）" />
      <template #footer>
        <el-button @click="showBanDialog = false">取消</el-button>
        <el-button type="danger" :disabled="!banReason.trim()" @click="handleBan">确认封禁</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUserList, banUser, unbanUser } from '../../api/users'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const loading = ref(false)
const users = ref([])
const total = ref(0)
const currentPage = ref(1)
const showBanDialog = ref(false)
const currentUser = ref(null)
const banReason = ref('')
const query = reactive({ keyword: '', status: '', pageSize: 20 })

const canWrite = computed(() => ['super_admin', 'content_moderator'].includes(authStore.role))

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN')
}

async function fetchData() {
  loading.value = true
  try {
    const res = await getUserList({ ...query, page: currentPage.value - 1 })
    users.value = res.list || []
    total.value = res.total || 0
  } catch (err) {
    users.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
  fetchData()
}

function handlePageChange(page) {
  currentPage.value = page
  fetchData()
}

function openBanDialog(row) {
  currentUser.value = row
  banReason.value = ''
  showBanDialog.value = true
}

async function handleBan() {
  await banUser(currentUser.value.openid, banReason.value)
  ElMessage.success('已封禁')
  showBanDialog.value = false
  banReason.value = ''
  fetchData()
}

async function handleUnban(row) {
  await ElMessageBox.confirm('确定解除该用户的封禁？', '提示')
  await unbanUser(row.openid)
  ElMessage.success('已解封')
  fetchData()
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

.dialog-user {
  margin-bottom: 12px;
  color: #666;
}
</style>
