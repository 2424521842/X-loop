<template>
  <div class="empty-state">
    <div class="empty-icon" aria-hidden="true">{{ icon }}</div>
    <p>{{ displayText }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../utils/i18n'

const props = defineProps({
  text: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: '∅'
  }
})

const { t } = useI18n()
const displayText = computed(() => props.text || t('common.empty'))
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
