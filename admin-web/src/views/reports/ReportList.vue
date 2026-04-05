<template>
  <div>
    <el-card>
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="待处理" name="pending" />
        <el-tab-pane label="处理中" name="processing" />
        <el-tab-pane label="已完结" name="resolved" />
      </el-tabs>

      <el-table :data="reports" v-loading="loading" stripe>
        <el-table-column prop="targetType" label="类型" width="90">
          <template #default="{ row }">{{ targetTypeText(row.targetType) }}</template>
        </el-table-column>
        <el-table-column prop="reason" label="原因" width="120" />
        <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip />
        <el-table-column prop="handlerUsername" label="处理人" width="110" />
        <el-table-column label="时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="$router.push(`/reports/${row._id}`)">处理</el-button>
          </template>
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
import { onMounted, ref } from 'vue'
import { getReportList } from '../../api/reports'

const loading = ref(false)
const reports = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = 20
const activeTab = ref('pending')

function targetTypeText(type) {
  return { product: '商品', user: '用户', message: '消息' }[type] || type
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN')
}

async function fetchData() {
  loading.value = true
  try {
    const res = await getReportList({ status: activeTab.value, page: currentPage.value - 1, pageSize })
    reports.value = res.list || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

function handleTabChange() {
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
.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
