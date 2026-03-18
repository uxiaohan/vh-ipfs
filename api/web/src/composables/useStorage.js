import { ref, computed } from 'vue';
import { storageApi } from '../api';

export function useStorage() {
  const storageInfo = ref({ used: 0, limit: 0, fs_free: 0 });
  const newStorageValue = ref(1);
  const newStorageUnit = ref('GB');
  const loading = ref(false);

  const usedPercentage = computed(() => {
    if (storageInfo.value.limit === 0) return 0;
    return Math.round((storageInfo.value.used / storageInfo.value.limit) * 100);
  });

  const remaining = computed(() => {
    return Math.max(0, storageInfo.value.limit - storageInfo.value.used);
  });

  const availablePercentage = computed(() => {
    if (storageInfo.value.fs_free === 0) return 0;
    return Math.round((remaining.value / storageInfo.value.fs_free) * 100);
  });

  async function loadStorageInfo() {
    loading.value = true;
    try {
      const result = await storageApi.getStorageInfo();
      storageInfo.value = {
        used: result.used_bytes ?? 0,
        limit: result.limit_bytes ?? 0,
        fs_free: result.fs_free_bytes ?? 0
      };

      const limitBytes = result.limit_bytes ?? 0;
      if (limitBytes >= 1024 ** 3) {
        newStorageValue.value = Math.round(limitBytes / (1024 ** 3) * 10) / 10;
        newStorageUnit.value = 'GB';
      } else {
        newStorageValue.value = Math.round(limitBytes / (1024 ** 2)) || 1;
        newStorageUnit.value = 'MB';
      }
    } catch (error) {
      console.error('Failed to load storage info:', error);
    } finally {
      loading.value = false;
    }
  }

  async function setStorageLimit() {
    loading.value = true;
    try {
      const bytes = newStorageUnit.value === 'GB' 
        ? newStorageValue.value * 1024 ** 3 
        : newStorageValue.value * 1024 ** 2;
      
      await storageApi.setStorageLimit(bytes);
      await loadStorageInfo();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      loading.value = false;
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  return {
    storageInfo,
    newStorageValue,
    newStorageUnit,
    loading,
    usedPercentage,
    remaining,
    availablePercentage,
    loadStorageInfo,
    setStorageLimit,
    formatBytes
  };
}