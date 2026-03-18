<template>
  <div class="admin-page">
    <div v-if="!isLoggedIn">
      <div v-if="hasPassword" class="login-box">
        <div class="card">
          <h2 class="login-title">管理员登录</h2>
          <div class="input-group">
            <label class="input-label">密码</label>
            <input
              type="password"
              class="input"
              v-model="loginPassword"
              @keyup.enter="handleLogin"
              placeholder="请输入管理员密码"
            />
          </div>
          <button
            class="btn btn-primary"
            style="width: 100%"
            @click="handleLogin"
            :disabled="loginLoading"
          >
            {{ loginLoading ? "登录中..." : "登录" }}
          </button>
        </div>
      </div>
      <div v-else class="login-box">
        <div class="card">
          <h2 class="login-title">设置管理员密码</h2>
          <div class="input-group">
            <label class="input-label">设置密码</label>
            <input
              type="password"
              class="input"
              v-model="setupPassword"
              @keyup.enter="submitSetupPassword"
              placeholder="请设置管理员密码"
            />
          </div>
          <button
            class="btn btn-primary"
            style="width: 100%"
            @click="submitSetupPassword"
            :disabled="setPasswordLoading"
          >
            {{ setPasswordLoading ? "设置中..." : "设置密码" }}
          </button>
        </div>
      </div>
    </div>

    <div v-else class="admin-grid">
      <div class="card storage-card">
        <div class="card-header">
          <h3 class="card-title">存储空间</h3>
          <div class="header-btns">
            <button
              class="btn btn-ghost btn-sm"
              @click="showStorageModal = true"
            >
              设置容量
            </button>
            <button
              class="btn btn-ghost btn-sm"
              @click="handleLoadPublicGateway"
            >
              设置Gateway
            </button>
            <button
              class="btn btn-ghost btn-sm"
              @click="showPasswordModal = true"
            >
              修改管理员密码
            </button>
            <button
              class="btn btn-ghost btn-sm"
              @click="showSitePasswordModal = true"
            >
              修改网站密码
            </button>
            <div class="switch-container">
              <label class="switch-label">网站密码</label>
              <label class="switch">
                <input
                  type="checkbox"
                  v-model="sitePasswordEnabled"
                  @change="toggleSitePassword"
                />
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>
        <div class="storage-info-grid">
          <div class="storage-stat">
            <div class="stat-value used">
              {{ formatBytes(storageInfo.used) }}
            </div>
            <div class="stat-label">已用空间</div>
          </div>
          <div class="storage-stat">
            <div class="stat-value remaining">{{ formatBytes(remaining) }}</div>
            <div class="stat-label">剩余容量</div>
          </div>
          <div class="storage-stat">
            <div class="stat-value available">
              {{ formatBytes(storageInfo.limit) }}
            </div>
            <div class="stat-label">可用容量</div>
          </div>
          <div class="storage-stat">
            <div class="stat-value disk">
              {{ formatBytes(storageInfo.fs_free) }}
            </div>
            <div class="stat-label">磁盘剩余</div>
          </div>
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: usedPercentage + '%' }"
          ></div>
        </div>
      </div>

      <div class="card file-card">
        <div class="card-header">
          <h3 class="card-title">文件管理</h3>
        </div>
        <div class="toolbar">
          <input
            type="text"
            class="search-input"
            v-model="searchKeyword"
            @keyup.enter="searchFiles"
            placeholder="搜索文件名、CID或IP地址"
          />
          <button class="btn btn-primary" @click="searchFiles">搜索</button>
        </div>
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="!hasImages" class="empty">暂无文件</div>
        <div v-else class="file-list">
          <table>
            <thead>
              <tr>
                <th>文件名</th>
                <th>CID</th>
                <th>大小</th>
                <th>上传时间</th>
                <th>设备</th>
                <th>访问次数</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="file in fileList" :key="file.id">
                <td>{{ file.original_name }}</td>
                <td class="cid-cell">{{ file.cid }}</td>
                <td>{{ formatBytes(file.size_bytes) }}</td>
                <td>{{ formatDate(file.created_at) }}</td>
                <td class="device-cell">
                  <div class="device-info">
                    <span class="device-icon">{{ getDeviceIcon(file.uploader_device) }}</span>
                    <span class="device-text">{{ file.uploader_browser }} / {{ file.uploader_os }}</span>
                  </div>
                </td>
                <td>{{ file.access_count || 0 }}</td>
                <td>
                  <button
                    class="btn btn-sm btn-ghost"
                    @click="openFile(file.ipfs_url)"
                  >
                    查看
                  </button>
                  <button
                    class="btn btn-sm btn-danger"
                    @click="handleDelete(file.id)"
                  >
                    删除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="hasImages" class="pagination">
          <button
            class="btn btn-ghost btn-sm"
            @click="prevPage"
            :disabled="pagination.page === 1"
          >
            上一页
          </button>
          <span class="page-info"
            >{{ pagination.page }} / {{ pagination.totalPages }}</span
          >
          <button
            class="btn btn-ghost btn-sm"
            @click="nextPage"
            :disabled="!hasMore"
          >
            下一页
          </button>
        </div>
      </div>
    </div>

    <Modal v-model="showStorageModal">
      <div class="modal-content">
        <h3>设置存储容量</h3>
        <div class="input-group">
          <label class="input-label">容量</label>
          <div class="storage-input">
            <input
              type="number"
              class="input"
              v-model="newStorageValue"
              min="1"
            />
            <select class="select" v-model="newStorageUnit">
              <option value="MB">MB</option>
              <option value="GB">GB</option>
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showStorageModal = false">
            取消
          </button>
          <button
            class="btn btn-primary"
            @click="handleSetStorage"
            :disabled="loading"
          >
            {{ loading ? "设置中..." : "确定" }}
          </button>
        </div>
      </div>
    </Modal>

    <Modal v-model="showPasswordModal">
      <div class="modal-content">
        <h3>修改管理员密码</h3>
        <div class="input-group">
          <label class="input-label">旧密码</label>
          <input
            type="password"
            class="input"
            v-model="oldPassword"
            placeholder="请输入旧密码"
          />
        </div>
        <div class="input-group">
          <label class="input-label">新密码</label>
          <input
            type="password"
            class="input"
            v-model="newPassword"
            placeholder="请输入新密码"
          />
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showPasswordModal = false">
            取消
          </button>
          <button class="btn btn-primary" @click="handleChangePassword">
            确定
          </button>
        </div>
      </div>
    </Modal>

    <Modal v-model="showSitePasswordModal">
      <div class="modal-content">
        <h3>修改网站密码</h3>
        <div class="input-group">
          <label class="input-label">管理员密码</label>
          <input
            type="password"
            class="input"
            v-model="adminPasswordForSite"
            placeholder="请输入管理员密码"
          />
        </div>
        <div class="input-group">
          <label class="input-label">新网站密码</label>
          <input
            type="password"
            class="input"
            v-model="newSitePassword"
            placeholder="请输入新网站密码"
          />
        </div>
        <div class="modal-actions">
          <button
            class="btn btn-secondary"
            @click="showSitePasswordModal = false"
          >
            取消
          </button>
          <button class="btn btn-primary" @click="handleChangeSitePassword">
            确定
          </button>
        </div>
      </div>
    </Modal>

    <Modal v-model="showGatewayModal">
      <div class="modal-content">
        <h3>设置Gateway</h3>
        <div class="gateway-list">
          <div
            v-for="(gateway, index) in gateways"
            :key="index"
            class="gateway-item"
          >
            <div class="gateway-inputs">
              <input
                type="text"
                class="input"
                v-model="gateway.name"
                placeholder="名称"
              />
              <input
                type="text"
                class="input"
                v-model="gateway.url"
                placeholder="URL"
              />
            </div>
            <button class="btn btn-sm btn-danger" @click="removeGateway(index)">
              删除
            </button>
          </div>
          <button class="btn btn-secondary" @click="addGateway">
            添加Gateway
          </button>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showGatewayModal = false">
            取消
          </button>
          <button class="btn btn-primary" @click="handleSaveGateways">
            确定
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from "vue";
import { useAuth } from "../composables/useAuth";
import { useStorage } from "../composables/useStorage";
import { useImages } from "../composables/useImages";
import { useGateways } from "../composables/useGateways";
import { authApi } from "../api";
import Modal from "../components/Modal.vue";
import { inject } from "vue";

defineOptions({ name: "AdminView" });

const toast = inject("toast");

const {
  isLoggedIn,
  loginPassword,
  loginLoading,
  hasPassword,
  setPasswordLoading,
  setupPassword,
  checkHasPassword,
  login,
  handleSetupPassword,
} = useAuth();

const {
  storageInfo,
  newStorageValue,
  newStorageUnit,
  loading: storageLoading,
  usedPercentage,
  remaining,
  loadStorageInfo,
  setStorageLimit,
  formatBytes: formatStorageBytes,
} = useStorage();

const {
  fileList,
  searchKeyword,
  pagination,
  loading: imagesLoading,
  hasImages,
  hasMore,
  loadFiles,
  deleteImage,
  searchFiles,
  nextPage,
  prevPage,
  formatBytes: formatImageBytes,
  formatDate,
} = useImages();

const {
  gateways,
  loading: gatewaysLoading,
  loadPublicGateway,
  saveGateways,
  addGateway,
  removeGateway,
} = useGateways();

const showStorageModal = ref(false);
const showPasswordModal = ref(false);
const showSitePasswordModal = ref(false);
const showGatewayModal = ref(false);
const oldPassword = ref("");
const newPassword = ref("");
const adminPasswordForSite = ref("");
const newSitePassword = ref("");
const sitePasswordEnabled = ref(false);

const loading = computed(
  () => storageLoading.value || imagesLoading.value || gatewaysLoading.value,
);

const formatBytes = (bytes) => formatStorageBytes(bytes);

function getDeviceIcon(device) {
  if (!device) return '💻';
  
  if (device === 'mobile' || device === 'tablet') {
    return '📱';
  }
  return '💻';
}

async function handleLogin() {
  if (hasPassword.value && !loginPassword.value) {
    toast.error("请输入密码");
    return;
  }

  const result = await login();
  if (result.success) {
    await Promise.all([loadStorageInfo(), loadFiles()]);
  } else {
    toast.error(result.error || "登录失败");
  }
}

async function submitSetupPassword() {
  if (!setupPassword.value) {
    toast.error("请输入密码");
    return;
  }

  const result = await handleSetupPassword();
  if (result.success) {
    toast.success("密码设置成功");
    await checkHasPassword();
  } else {
    toast.error(result.error || "设置失败");
  }
}

async function handleChangePassword() {
  if (!oldPassword.value || !newPassword.value) {
    toast.error("请输入密码");
    return;
  }

  try {
    await authApi.changePassword(oldPassword.value, newPassword.value);
    toast.success("密码修改成功");
    showPasswordModal.value = false;
    oldPassword.value = "";
    newPassword.value = "";
  } catch (error) {
    toast.error(error.message || "修改失败");
  }
}

async function handleChangeSitePassword() {
  if (!adminPasswordForSite.value || !newSitePassword.value) {
    toast.error("请输入密码");
    return;
  }

  try {
    await authApi.changeSitePassword(
      adminPasswordForSite.value,
      newSitePassword.value,
    );
    toast.success("网站密码修改成功");
    showSitePasswordModal.value = false;
    adminPasswordForSite.value = "";
    newSitePassword.value = "";
  } catch (error) {
    toast.error(error.message || "修改失败");
  }
}

async function handleSetStorage() {
  const result = await setStorageLimit();
  if (result.success) {
    toast.success("存储容量设置成功");
    showStorageModal.value = false;
  } else {
    toast.error(result.error || "设置失败");
  }
}

async function toggleSitePassword() {
  try {
    await authApi.setSitePasswordEnabled(sitePasswordEnabled.value);
    toast.success(
      sitePasswordEnabled.value ? "网站密码已启用" : "网站密码已禁用",
    );
  } catch (error) {
    if (error.message === "password_not_set") {
      toast.error("请先设置网站密码后开启");
      sitePasswordEnabled.value = !sitePasswordEnabled.value;
    } else {
      toast.error(error.message || "设置失败");
      sitePasswordEnabled.value = !sitePasswordEnabled.value;
    }
  }
}

async function handleDelete(id) {
  const result = await deleteImage(id);
  if (result.success) {
    toast.success("删除成功");
  } else {
    toast.error(result.error || "删除失败");
  }
}

async function handleSaveGateways() {
  const result = await saveGateways(gateways.value);
  if (result.success) {
    toast.success("Gateway设置成功");
    showGatewayModal.value = false;
  } else {
    toast.error(result.error || "设置失败");
  }
}

async function handleLoadPublicGateway() {
  await loadPublicGateway();
  showGatewayModal.value = true;
}

async function loadSitePasswordEnabled() {
  try {
    const result = await authApi.getSitePasswordEnabled();
    sitePasswordEnabled.value = result.enabled;
  } catch (error) {
    console.error("Failed to load site password enabled status:", error);
  }
}

function openFile(url) {
  window.open(url, "_blank");
}

onMounted(async () => {
  if (isLoggedIn.value) {
    await Promise.all([
      loadStorageInfo(),
      loadFiles(),
      loadSitePasswordEnabled(),
    ]);
  } else {
    await checkHasPassword();
  }
});
</script>

<style scoped>
.admin-page {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  padding: 2rem;
}

.admin-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.login-box {
  max-width: 400px;
  margin: 4rem auto;
  text-align: center;
}

.login-title {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
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
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #f1f5f9;
  flex-shrink: 0;
}

.header-btns {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
  flex: 1;
  justify-content: flex-end;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
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

.btn-secondary {
  background: #475569;
  color: white;
}

.btn-secondary:hover {
  background: #334155;
}

.btn-ghost {
  background: transparent;
  color: #94a3b8;
  border: 1px solid #334155;
}

.btn-ghost:hover {
  background: #334155;
  color: #f1f5f9;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

.btn-sm {
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: #334155;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #f1f5f9;
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.input:focus {
  outline: none;
  border-color: #6366f1;
}

.input-group {
  margin-bottom: 1rem;
}

.input-label {
  display: block;
  text-align: left;
  font-size: 0.85rem;
  color: #94a3b8;
  margin-bottom: 0.5rem;
}

.select {
  padding: 0.75rem 1rem;
  background: #334155;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #f1f5f9;
  font-size: 0.95rem;
  cursor: pointer;
}

.select:focus {
  outline: none;
  border-color: #6366f1;
}

.storage-info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.storage-stat {
  text-align: center;
  padding: 1rem;
  background: #0f172a;
  border-radius: 12px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 0.5rem;
}

.stat-value.used {
  color: #6366f1;
}

.stat-value.remaining {
  color: #10b981;
}

.stat-value.available {
  color: #f59e0b;
}

.stat-value.disk {
  color: #3b82f6;
}

.stat-label {
  font-size: 0.85rem;
  color: #94a3b8;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #334155;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%);
  transition: width 0.3s;
}

.toolbar {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 200px;
  padding: 0.6rem 1rem;
  background: #334155;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #f1f5f9;
  font-size: 0.9rem;
}

.search-input:focus {
  outline: none;
  border-color: #6366f1;
}

.file-list {
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid #334155;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 800px;
}

thead {
  background: #0f172a;
}

th {
  padding: 1rem;
  text-align: left;
  font-size: 0.85rem;
  color: #94a3b8;
  font-weight: 600;
  white-space: nowrap;
}

td {
  padding: 1rem;
  border-bottom: 1px solid #334155;
  color: #f1f5f9;
  font-size: 0.9rem;
}

tr:last-child td {
  border-bottom: none;
}

.cid-cell {
  font-family: monospace;
  font-size: 0.85rem;
  color: #6366f1;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-cell {
  min-width: 150px;
}

.device-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.device-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.device-text {
  font-size: 0.85rem;
  color: #94a3b8;
  white-space: nowrap;
}

.loading,
.empty {
  text-align: center;
  padding: 3rem;
  color: #94a3b8;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

.page-info {
  color: #94a3b8;
  font-size: 0.9rem;
}

.switch-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.switch-label {
  font-size: 0.85rem;
  color: #94a3b8;
}

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #334155;
  transition: 0.3s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.switch input:checked + .slider {
  background-color: #6366f1;
}

.switch input:checked + .slider:before {
  transform: translateX(20px);
}

.switch input:focus + .slider {
  box-shadow: 0 0 1px #6366f1;
}

.modal-content {
  padding: 1rem;
}

.modal-content h3 {
  margin-bottom: 1.5rem;
  color: #f1f5f9;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.storage-input {
  display: flex;
  gap: 0.5rem;
}

.gateway-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.gateway-item {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.gateway-inputs {
  display: flex;
  gap: 0.5rem;
  flex: 1;
}

.gateway-inputs .input {
  flex: 1;
}
</style>
