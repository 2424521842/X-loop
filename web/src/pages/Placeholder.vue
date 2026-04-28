<template>
  <section class="placeholder-page">
    <div class="placeholder-card card">
      <p class="route-path">{{ route.fullPath }}</p>
      <h1>{{ t('placeholder.title') }}</h1>
      <p>{{ t('common.routeLabel', { path: route.fullPath }) }}</p>
    </div>
  </section>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { useI18n } from '../utils/i18n'

const route = useRoute()
const { t } = useI18n()
</script>

<style scoped lang="scss">
.placeholder-page {
  padding: 40px 16px;
}

.placeholder-card {
  width: min(720px, 100%);
  margin: 0 auto;
  padding: 28px;
  text-align: center;
}

.route-path {
  margin: 0 0 12px;
  color: var(--color-primary);
  font-weight: 700;
}

h1 {
  margin: 0 0 10px;
  color: var(--color-dark);
  font-size: 24px;
}

p {
  color: var(--color-text-secondary);
}
</style>
