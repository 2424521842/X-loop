<template>
  <section class="publish-page">
    <div class="publish-card card">
      <div class="page-head">
        <h1>发布商品</h1>
        <p>填写商品信息后，买家可在站内聊天联系你完成线下交易。</p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent
      >
        <el-form-item label="商品标题" prop="title">
          <el-input
            v-model.trim="form.title"
            maxlength="100"
            show-word-limit
            placeholder="例如：九成新 MacBook Air M2"
            size="large"
          />
        </el-form-item>

        <el-form-item label="商品描述" prop="description">
          <el-input
            v-model.trim="form.description"
            type="textarea"
            :rows="5"
            maxlength="2000"
            show-word-limit
            placeholder="成色、购买时间、配件、交易地点等"
          />
        </el-form-item>

        <el-form-item label="价格" prop="price">
          <el-input-number
            v-model="form.price"
            class="full-width"
            :min="0"
            :precision="2"
            :step="1"
            size="large"
          />
        </el-form-item>

        <el-form-item label="分类" prop="category">
          <el-select
            v-model="form.category"
            class="full-width"
            placeholder="请选择分类"
            size="large"
          >
            <el-option
              v-for="category in CATEGORIES"
              :key="category.id"
              :label="category.name"
              :value="category.name"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="商品图片">
          <ImageUploader v-model="form.images" folder="products" />
        </el-form-item>

        <el-button
          class="full-width"
          type="primary"
          size="large"
          :loading="submitting"
          @click="handleSubmit"
        >
          发布
        </el-button>
      </el-form>
    </div>
  </section>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import ImageUploader from '../components/ImageUploader.vue'
import { createProduct } from '../api/products'
import { CATEGORIES } from '../utils/format'

const router = useRouter()
const formRef = ref(null)
const submitting = ref(false)

const form = reactive({
  title: '',
  description: '',
  price: 0,
  category: '',
  images: []
})

function validatePrice(rule, value, callback) {
  const price = Number(value)
  if (value === '' || value === null || value === undefined || Number.isNaN(price)) {
    callback(new Error('请输入价格'))
    return
  }
  if (price < 0) {
    callback(new Error('价格不能小于 0'))
    return
  }
  callback()
}

const rules = {
  title: [{ required: true, message: '请输入商品标题', trigger: 'blur' }],
  price: [{ validator: validatePrice, trigger: 'change' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }]
}

async function handleSubmit() {
  await formRef.value.validate()

  submitting.value = true
  try {
    await createProduct({
      title: form.title,
      description: form.description,
      price: form.price,
      category: form.category,
      images: form.images
    })
    ElMessage.success('发布成功')
    router.push('/my-products')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.publish-page {
  display: flex;
  justify-content: center;
  padding: 32px 16px 48px;
}

.publish-card {
  width: min(720px, 100%);
  margin: 0;
  padding: 28px;
}

.page-head {
  margin-bottom: 24px;
}

.page-head h1 {
  margin: 0 0 8px;
  color: var(--color-dark);
  font-size: 26px;
}

.page-head p {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.full-width {
  width: 100%;
}

@media (max-width: 600px) {
  .publish-page {
    padding: 20px 12px 36px;
  }

  .publish-card {
    padding: 20px;
  }
}
</style>
