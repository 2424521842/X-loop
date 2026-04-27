<template>
  <div>
    <el-card>
      <div class="card-header">
        <h3>分类管理</h3>
        <el-button type="primary" @click="showAddDialog = true">新增分类</el-button>
      </div>
      <el-table :data="categories" v-loading="loading" stripe>
        <el-table-column prop="category" label="分类ID" width="150" />
        <el-table-column prop="name" label="分类名称" width="200" />
        <el-table-column prop="count" label="商品数" width="100" />
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button type="primary" link @click="openEditDialog(row)">编辑</el-button>
            <el-button type="danger" link :disabled="row.count > 0" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
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

    <el-dialog v-model="showEditDialog" title="编辑分类" width="420px">
      <el-form :model="editCategory" label-width="80px">
        <el-form-item label="ID">
          <el-input v-model="editCategory.id" disabled />
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="editCategory.name" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="handleUpdate">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createCategory, deleteCategory, getCategories, updateCategory } from '../../api/system'

const loading = ref(false)
const categories = ref([])
const showAddDialog = ref(false)
const showEditDialog = ref(false)
const newCategory = reactive({ id: '', name: '' })
const editCategory = reactive({ id: '', name: '' })

async function fetchData() {
  loading.value = true
  try {
    const res = await getCategories()
    categories.value = res.items || []
  } finally {
    loading.value = false
  }
}

async function handleAdd() {
  if (!newCategory.id || !newCategory.name) {
    ElMessage.warning('请填写完整')
    return
  }

  try {
    await createCategory(newCategory)
    ElMessage.success('已创建')
    showAddDialog.value = false
    Object.assign(newCategory, { id: '', name: '' })
    fetchData()
  } catch (err) { /* 错误已在 request.js 中处理 */ }
}

function openEditDialog(row) {
  Object.assign(editCategory, { id: row.id, name: row.name })
  showEditDialog.value = true
}

async function handleUpdate() {
  if (!editCategory.name) {
    ElMessage.warning('请填写分类名称')
    return
  }

  try {
    await updateCategory(editCategory.id, { name: editCategory.name })
    ElMessage.success('已保存')
    showEditDialog.value = false
    fetchData()
  } catch (err) { /* 错误已在 request.js 中处理 */ }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除分类 ${row.name}？`, '提示')
    await deleteCategory(row.id)
    ElMessage.success('已删除')
    fetchData()
  } catch (err) { /* 取消或错误 */ }
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
