<template>
  <div class="toast" :class="[type, { show: visible }]" @click="close">
    <span class="toast-icon">{{ icon }}</span>
    <span class="toast-message">{{ message }}</span>
  </div>
</template>

<script setup lang="js">
import { computed } from 'vue'

defineOptions({ name: 'ToastComponent' })

const props = defineProps({
  message: { type: String, default: '' },
  type: { type: String, default: 'info' }
})

const emit = defineEmits(['close'])

const visible = computed(() => !!props.message)

const iconMap = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' }
const icon = computed(() => iconMap[props.type] ?? 'ℹ')

const close = () => emit('close')
</script>

<style scoped>
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: #1e293b;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  transform: translateX(120%);
  transition: transform 0.3s ease;
  z-index: 9999;
  cursor: pointer;
}

.toast.show {
  transform: translateX(0);
}

.toast.success {
  border-left: 4px solid #10b981;
}

.toast.error {
  border-left: 4px solid #ef4444;
}

.toast.warning {
  border-left: 4px solid #f59e0b;
}

.toast.info {
  border-left: 4px solid #6366f1;
}

.toast-icon {
  font-size: 1.2rem;
}

.toast-message {
  color: #f1f5f9;
  font-size: 0.9rem;
}
</style>
