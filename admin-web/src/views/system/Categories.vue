<template>
  <div>
    <el-card>
      <div class="card-header">
        <h3>分类管理</h3>
        <el-button type="primary" @click="showAddDialog = true">新增分类</el-button>
      </div>
      <el-table :data="categories" stripe>
        <el-table-column prop="category" label="分类ID" width="150" />
        <el-table-column prop="name" label="分类名称" width="200" />
        <el-table-column prop="count" label="商品数" width="100" />
      </el-table>
    </el-card>

    <el-dialog v-model="showAddDialog" title="新增分类" width="420px">
      <el-form :model="newCategory" label-width="80px">
        <el-form-item label="ID">
          <el-input v-model="newCategory.id" placeholder="英文标识 如 beauty" />
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="newCategory.name" placeholder="中文名称 如 美妆护肤" />
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
import { getCategoryDistribution } from '../../api/system'

const categories = ref([])
const showAddDialog = ref(false)
const newCategory = reactive({ id: '', name: '' })

async function fetchData() {
  categories.value = await getCategoryDistribution()
}

async function handleAdd() {
  if (!newCategory.id || !newCategory.name) {
    ElMessage.warning('请填写完整')
    return
  }

  ElMessage.info('分类数据当前由代码配置管理，后续版本支持动态管理')
  showAddDialog.value = false
  Object.assign(newCategory, { id: '', name: '' })
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
