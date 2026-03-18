<template>
  <div class="app">
    <header class="header" v-if="isLoggedIn">
      <div class="logo">IPFS Gallery</div>
      <nav class="nav">
        <router-link to="/" class="nav-btn" :class="{ active: $route.path === '/' }">上传</router-link>
        <router-link to="/admin" class="nav-btn" :class="{ active: $route.path === '/admin' }">管理</router-link>
      </nav>
    </header>
    <main class="main">
      <router-view />
    </main>
    <Toast 
      :message="toast.state.message" 
      :type="toast.state.type"
      @close="toast.close"
    />
  </div>
</template>

<script setup lang="js">
import { ref, onMounted, provide } from 'vue'
import { useRouter } from 'vue-router'
import Toast from './components/Toast.vue'
import { useToast } from './composables/useToast'

defineOptions({ name: 'AppRoot' })

const router = useRouter()
const isLoggedIn = ref(false)
const toast = useToast()

provide('toast', toast)

onMounted(() => {
  isLoggedIn.value = Boolean(localStorage.getItem('site_token'))
})

router.afterEach((to) => {
  isLoggedIn.value = Boolean(localStorage.getItem('site_token'))
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0f172a;
  color: #f1f5f9;
  line-height: 1.6;
}

.app {
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #334155;
  max-width: 1200px;
  margin: 0 auto;
}

.logo {
  font-size: 1.75rem;
  font-weight: 700;
  background: linear-gradient(135deg, #6366f1, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav {
  display: flex;
  gap: 0.5rem;
  background: #1e293b;
  padding: 4px;
  border-radius: 12px;
}

.nav-btn {
  padding: 0.5rem 1.25rem;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.2s;
}

.nav-btn.active,
.nav-btn:hover {
  background: #6366f1;
  color: white;
}

.main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
  
  .main {
    padding: 1rem;
  }
}
</style>
