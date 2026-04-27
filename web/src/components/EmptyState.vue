<template>
  <div class="empty-state">
    <div class="empty-icon" aria-hidden="true">{{ icon }}</div>
    <p>{{ text }}</p>
  </div>
</template>

<script setup>
defineProps({
  text: {
    type: String,
    default: '暂无数据'
  },
  icon: {
    type: String,
    default: '∅'
  }
})
</script>

<style scoped lang="scss">
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  padding: 32px 16px;
  color: var(--color-text-secondary);
  text-align: center;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: 12px;
  border-radius: 50%;
  background: var(--color-tag-bg);
  color: var(--color-primary);
  font-size: 30px;
  font-weight: 700;
}

p {
  margin: 0;
  font-size: 15px;
}
</style>
