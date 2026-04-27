<template>
  <div>
    <el-card>
      <el-form inline class="filter-form">
        <el-form-item label="操作人">
          <el-input v-model="query.username" clearable placeholder="用户名" />
        </el-form-item>
        <el-form-item label="操作类型">
          <el-select v-model="query.action" clearable placeholder="全部">
            <el-option label="封禁用户" value="ban_user" />
            <el-option label="解封用户" value="unban_user" />
            <el-option label="下架商品" value="remove_product" />
            <el-option label="恢复商品" value="restore_product" />
            <el-option label="处理举报" value="resolve_report" />
            <el-option label="调整信誉分" value="adjust_credit" />
            <el-option label="纠纷介入" value="intervene_order" />
            <el-option label="纠纷裁决" value="resolve_dispute" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="logs" v-loading="loading" stripe>
        <el-table-column prop="username" label="操作人" width="120" />
        <el-table-column prop="action" label="操作类型" width="130" />
        <el-table-column prop="targetType" label="目标类型" width="90" />
        <el-table-column prop="targetId" label="目标ID" min-width="200" show-overflow-tooltip />
        <el-table-column label="详情" min-width="220">
          <template #default="{ row }">{{ JSON.stringify(row.detail || {}) }}</template>
        </el-table-column>
        <el-table-column label="时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="currentPage"
        class="pagination"
        background
        layout="total, prev, pager, next"
        :total="total"
        :page-size="pageSize"
        @current-change="handlePageChange"
      />
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { getAdminLogs } from '../../api/system'

const loading = ref(false)
const logs = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = 20
const query = reactive({ username: '', action: '' })

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN')
}

async function fetchData() {
  loading.value = true
  try {
    const res = await getAdminLogs({ ...query, page: currentPage.value - 1, pageSize })
    logs.value = res.items || []
    total.value = res.total || 0
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

onMounted(fetchData)
</script>

<style scoped>
.filter-form {
  margin-bottom: 16px;
}

.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
