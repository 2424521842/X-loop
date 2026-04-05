<template>
  <div>
    <el-card>
      <div class="card-header">
        <h3>管理员列表</h3>
        <el-button type="primary" @click="showAddDialog = true">新增管理员</el-button>
      </div>
      <el-table :data="admins" v-loading="loading" stripe>
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="displayName" label="名称" width="150" />
        <el-table-column prop="role" label="角色" width="150">
          <template #default="{ row }">{{ roleLabels[row.role] || row.role }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
              {{ row.status === 'active' ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最后登录" width="180">
          <template #default="{ row }">{{ row.lastLoginTime ? new Date(row.lastLoginTime).toLocaleString('zh-CN') : '-' }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="showAddDialog" title="新增管理员" width="460px">
      <el-form :model="newAdmin" label-width="80px">
        <el-form-item label="用户名"><el-input v-model="newAdmin.username" /></el-form-item>
        <el-form-item label="密码"><el-input v-model="newAdmin.password" type="password" /></el-form-item>
        <el-form-item label="名称"><el-input v-model="newAdmin.displayName" /></el-form-item>
        <el-form-item label="角色">
          <el-select v-model="newAdmin.role">
            <el-option v-for="(label, key) in roleLabels" :key="key" :label="label" :value="key" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAdd">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ROLE_LABELS } from '../../utils/permission'
import { createAdmin, getAdminList } from '../../api/system'

const roleLabels = ROLE_LABELS
const loading = ref(false)
const admins = ref([])
const showAddDialog = ref(false)
const newAdmin = reactive({ username: '', password: '', displayName: '', role: 'content_moderator' })

async function fetchData() {
  loading.value = true
  try {
    const res = await getAdminList()
    admins.value = res.list || []
  } finally {
    loading.value = false
  }
}

async function handleAdd() {
  if (!newAdmin.username || !newAdmin.password || !newAdmin.displayName) {
    ElMessage.warning('请填写完整信息')
    return
  }

  await createAdmin(newAdmin)
  ElMessage.success('已创建')
  showAddDialog.value = false
  Object.assign(newAdmin, { username: '', password: '', displayName: '', role: 'content_moderator' })
  fetchData()
}

onMounted(fetchData)
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-header h3 {
  margin: 0;
}
</style>
