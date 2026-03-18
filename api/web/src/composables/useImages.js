import { ref, computed } from 'vue';
import { imageApi } from '../api';

export function useImages() {
  const fileList = ref([]);
  const searchKeyword = ref('');
  const pagination = ref({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const loading = ref(false);

  const hasImages = computed(() => fileList.value.length > 0);
  const hasMore = computed(() => pagination.value.page < pagination.value.totalPages);

  async function loadFiles() {
    loading.value = true;
    try {
      const result = await imageApi.getImages({
        search: searchKeyword.value,
        page: pagination.value.page,
        pageSize: pagination.value.pageSize
      });
      fileList.value = result.data;
      pagination.value = result.pagination;
    } catch (error) {
      console.error('Failed to load images:', error);
      fileList.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function deleteImage(id) {
    try {
      await imageApi.deleteImage(id);
      fileList.value = fileList.value.filter(img => img.id !== id);
      pagination.value.total--;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  function searchFiles() {
    pagination.value.page = 1;
    loadFiles();
  }

  function nextPage() {
    if (hasMore.value) {
      pagination.value.page++;
      loadFiles();
    }
  }

  function prevPage() {
    if (pagination.value.page > 1) {
      pagination.value.page--;
      loadFiles();
    }
  }

  function goToPage(page) {
    if (page >= 1 && page <= pagination.value.totalPages) {
      pagination.value.page = page;
      loadFiles();
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return {
    fileList,
    searchKeyword,
    pagination,
    loading,
    hasImages,
    hasMore,
    loadFiles,
    deleteImage,
    searchFiles,
    nextPage,
    prevPage,
    goToPage,
    formatBytes,
    formatDate
  };
}