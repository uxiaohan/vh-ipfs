<template>
  <div class="upload-page">
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">上传文件</h3>
        <button class="btn btn-primary btn-sm admin-login-btn" @click="goToAdmin">🔐 管理</button>
      </div>
      <div 
        class="upload-zone"
        :class="{ dragover }"
        @click="$refs.fileInput.click()"
        @dragover.prevent="dragover = true"
        @dragleave="dragover = false"
        @drop.prevent="handleDrop"
      >
        <div class="upload-icon">📁</div>
        <p class="upload-text">拖拽文件到此处，或点击选择文件</p>
        <p class="upload-hint">支持所有文件类型</p>
        <input 
          type="file" 
          ref="fileInput" 
          @change="handleFileSelect" 
          style="display: none;" 
          multiple
        >
      </div>

      <div v-if="selectedFiles.length" class="file-info">
        <div class="file-info-row">
          <span class="file-info-label">已选择</span>
          <span>{{ selectedFiles.length }} 个文件</span>
        </div>
        <div class="file-info-row">
          <span class="file-info-label">总大小</span>
          <span>{{ formatBytes(selectedFiles.reduce((sum, f) => sum + f.size, 0)) }}</span>
        </div>
      </div>

      <button 
        class="btn btn-primary" 
        style="width: 100%; margin-top: 1rem;" 
        @click="uploadFile" 
        :disabled="!selectedFiles.length || uploading"
      >
        {{ uploading ? '上传中...' : '开始上传' }}
      </button>

      <div class="gateway-selector">
        <label class="gateway-label">访问网关</label>
        <select class="gateway-select" v-model="selectedGateway">
          <option v-for="gw in gatewayList" :key="gw.url" :value="gw.url">
            {{ gw.name }}
          </option>
        </select>
      </div>

      <div class="progress-bar" v-if="uploading">
        <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
      </div>

      <div class="result-box" v-if="uploadResult">{{ uploadResult }}</div>

      <div class="ipfs-status" :class="{ available: ipfsAvailable, unavailable: !ipfsAvailable }">
        <span class="status-dot"></span>
        <span class="status-text">IPFS {{ ipfsAvailable ? '可用' : '不可用' }}</span>
      </div>
    </div>

    <div class="card">
      <h3 class="card-title">最近上传</h3>
      <div v-if="recentLoading" class="empty-state">加载中...</div>
      <div v-else-if="recentList.length === 0" class="empty-state">暂无上传记录</div>
      <div v-else class="recent-grid">
        <div 
          class="recent-item" 
          v-for="item in recentList" 
          :key="item.id" 
          @click="openFile(item.local_url)"
        >
          <img 
            v-if="item.mime_type && item.mime_type.startsWith('image/')" 
            :src="item.local_url" 
            class="recent-thumb" 
            loading="lazy"
          >
          <div v-else class="recent-thumb video-thumb">{{ getFileIcon(item.original_name, item.mime_type) }}</div>
          <div class="recent-info">
            <div class="recent-name" :title="item.original_name">{{ item.original_name }}</div>
            <div class="recent-date">{{ formatDate(item.created_at) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="js">
import { ref, computed, onMounted, inject } from 'vue'

defineOptions({ name: 'UploadView' })

const toast = inject('toast')

const fileInput = ref(null)
const dragover = ref(false)
const selectedFiles = ref([])
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadResult = ref('')
const recentList = ref([])
const recentLoading = ref(false)
const gatewayList = ref([])
const selectedGateway = ref('')
const ipfsAvailable = ref(true)

const totalSize = computed(() => selectedFiles.value.reduce((sum, f) => sum + f.size, 0))

const formatBytes = (bytes) => {
  if (!bytes) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let idx = 0
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024
    idx++
  }
  return `${value.toFixed(2)} ${units[idx]}`
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

const getFileIcon = (filename, mime) => {
  const ext = filename?.split('.').pop()?.toLowerCase() || ''
  
  if (mime?.startsWith('image/')) return '🖼️'
  if (mime?.startsWith('video/')) return '🎬'
  if (mime?.startsWith('audio/')) return '🎵'
  
  const iconMap = {
    pdf: '📄',
    doc: '📝',
    docx: '📝',
    xls: '📊',
    xlsx: '📊',
    ppt: '📽️',
    pptx: '📽️',
    txt: '📃',
    zip: '📦',
    rar: '📦',
    '7z': '📦',
    tar: '📦',
    gz: '📦',
    exe: '⚙️',
    msi: '⚙️',
    apk: '📱',
    ipa: '📱',
    html: '🌐',
    css: '🎨',
    js: '📜',
    json: '📋',
    xml: '📋',
    md: '📝',
    sql: '🗄️',
    db: '🗄️',
    sqlite: '🗄️'
  }
  
  return iconMap[ext] || '📁'
}

const loadGateways = async () => {
  try {
    const res = await fetch('/api/public-gateway')
    if (res.ok) {
      const json = await res.json()
      gatewayList.value = json.gateways || []
    }
  } catch {
    gatewayList.value = []
  }
  
  const currentDomain = window.location.origin
  gatewayList.value = [{ name: '当前域名', url: currentDomain }, ...gatewayList.value]
  selectedGateway.value = currentDomain
}

const loadRecent = async () => {
  recentLoading.value = true
  try {
    const res = await fetch('/api/images?limit=8')
    recentList.value = res.ok ? await res.json() : []
  } catch {
    recentList.value = []
  } finally {
    recentLoading.value = false
  }
}

const handleFileSelect = (e) => {
  const files = Array.from(e.target.files)
  if (files.length) {
    selectedFiles.value = files
    uploadResult.value = ''
  }
}

const handleDrop = (e) => {
  dragover.value = false
  const files = Array.from(e.dataTransfer.files)
  if (files.length) {
    selectedFiles.value = files
    uploadResult.value = ''
  }
}

const uploadFile = async () => {
  if (!selectedFiles.value.length) return
  
  uploading.value = true
  uploadProgress.value = 0
  uploadResult.value = ''

  let successCount = 0
  let failCount = 0
  const results = []

  for (let i = 0; i < selectedFiles.value.length; i++) {
    const formData = new FormData()
    formData.append('file', selectedFiles.value[i])

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const json = await res.json()
        successCount++
        const gateway = selectedGateway.value || window.location.origin
        results.push(`${json.original_name}: ${gateway}/ipfs/${json.cid}`)
      } else {
        failCount++
      }
    } catch {
      failCount++
    }
    uploadProgress.value = Math.round(((i + 1) / selectedFiles.value.length) * 100)
  }

  if (failCount === 0) {
    toast.success(`上传成功 ${successCount} 个文件`)
  } else if (successCount === 0) {
    toast.error(`上传失败 ${failCount} 个文件`)
  } else {
    toast.warning(`成功 ${successCount} 个，失败 ${failCount} 个`)
  }

  if (successCount > 0) {
    uploadResult.value = results.join('\n')
    selectedFiles.value = []
    loadRecent()
  }
  
  uploading.value = false
}

const openFile = (url) => window.open(url, '_blank')

const checkIpfsHealth = async () => {
  try {
    const res = await fetch('/api/health')
    if (res.ok) {
      const json = await res.json()
      ipfsAvailable.value = json.ipfs
    }
  } catch {
    ipfsAvailable.value = false
  }
}

const goToAdmin = () => {
  window.location.href = '/admin'
}

onMounted(() => {
  loadGateways()
  loadRecent()
  checkIpfsHealth()
})
</script>

<style scoped>
.upload-page {
  display: grid;
  gap: 2rem;
}

.card {
  background: #1e293b;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.card-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0;
}

.upload-zone {
  border: 2px dashed #334155;
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: #334155;
}

.upload-zone:hover,
.upload-zone.dragover {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
}

.upload-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.upload-text {
  color: #94a3b8;
  margin-bottom: 0.5rem;
}

.upload-hint {
  color: #64748b;
  font-size: 0.8rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #6366f1;
  color: white;
}

.btn-primary:hover {
  background: #4f46e5;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.file-info {
  margin-top: 1rem;
  padding: 1rem;
  background: #334155;
  border-radius: 8px;
}

.file-info-row {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
  font-size: 0.9rem;
}

.file-info-label {
  color: #94a3b8;
}

.gateway-selector {
  margin-top: 1rem;
  padding: 1rem;
  background: #334155;
  border-radius: 8px;
}

.gateway-label {
  display: block;
  font-size: 0.85rem;
  color: #94a3b8;
  margin-bottom: 0.5rem;
}

.gateway-select {
  width: 100%;
  padding: 0.6rem;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #f1f5f9;
  font-size: 0.9rem;
  cursor: pointer;
}

.gateway-select:focus {
  outline: none;
  border-color: #6366f1;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #334155;
  border-radius: 3px;
  overflow: hidden;
  margin-top: 1rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #a855f7);
  transition: width 0.3s;
}

.result-box {
  margin-top: 1rem;
  padding: 1rem;
  background: #0f172a;
  border-radius: 8px;
  font-family: monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  word-break: break-all;
}

.recent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.recent-item {
  background: #334155;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}

.recent-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
}

.recent-thumb {
  width: 100%;
  height: 120px;
  object-fit: cover;
  background: #0f172a;
}

.video-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
}

.recent-info {
  padding: 0.75rem;
}

.recent-name {
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-date {
  font-size: 0.7rem;
  color: #94a3b8;
  margin-top: 0.25rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #94a3b8;
}

.ipfs-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
}

.ipfs-status.available {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.ipfs-status.unavailable {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.ipfs-status.available .status-dot {
  background: #22c55e;
}

.ipfs-status.unavailable .status-dot {
  background: #ef4444;
}

.admin-login-btn {
  font-weight: 500;
  letter-spacing: 0.02em;
}

@media (max-width: 768px) {
  .upload-page {
    gap: 1rem;
  }

  .card {
    padding: 1rem;
    border-radius: 12px;
  }

  .card-header {
    margin-bottom: 0.75rem;
  }

  .card-title {
    font-size: 1rem;
  }

  .upload-zone {
    padding: 2rem 1rem;
  }

  .upload-icon {
    font-size: 2.5rem;
  }

  .upload-text {
    font-size: 0.9rem;
  }

  .gateway-selector {
    flex-direction: column;
    align-items: stretch;
  }

  .gateway-select {
    width: 100%;
  }

  .file-card {
    padding: 0;
  }

  .file-card .card-header {
    padding: 1rem;
  }

  .toolbar {
    padding: 0.75rem 1rem;
    flex-direction: column;
    gap: 0.5rem;
  }

  .toolbar .search-input {
    width: 100%;
  }

  .recent-files-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.75rem;
  }

  .recent-item {
    padding: 0.5rem;
  }

  .recent-icon {
    font-size: 1.5rem;
  }

  .recent-name {
    font-size: 0.75rem;
  }

  .ipfs-status {
    font-size: 0.8rem;
    padding: 0.5rem 0.75rem;
  }

  .admin-login-btn {
    padding: 0.35rem 0.6rem;
    font-size: 0.75rem;
  }
}

@media (max-width: 480px) {
  .card {
    padding: 0.75rem;
    border-radius: 10px;
  }

  .upload-zone {
    padding: 1.5rem 0.75rem;
  }

  .upload-icon {
    font-size: 2rem;
  }

  .upload-text {
    font-size: 0.85rem;
  }

  .upload-hint {
    font-size: 0.75rem;
  }

  .recent-files-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
}
</style>
