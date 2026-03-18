<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="login-title">IPFS Gallery</h1>
      <p class="login-subtitle">请输入访问密码</p>
      <div class="login-form">
        <input 
          type="password" 
          class="login-input" 
          v-model="password" 
          @keyup.enter="login"
          placeholder="请输入密码"
        >
        <button class="login-btn" @click="login" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="js">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { inject } from 'vue'

defineOptions({ name: 'LoginView' })

const router = useRouter()
const toast = inject('toast')
const password = ref('')
const loading = ref(false)

const login = async () => {
  if (!password.value) return
  
  loading.value = true
  try {
    const res = await fetch('/api/site-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password.value })
    })
    
    if (res.ok) {
      const json = await res.json()
      localStorage.setItem('site_token', json.token)
      router.push('/')
    } else {
      toast.error('密码错误')
    }
  } catch {
    toast.error('登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  padding: 1rem;
  box-sizing: border-box;
  overflow: hidden;
  z-index: 1000;
}

.login-card {
  background: #1e293b;
  border-radius: 16px;
  padding: 1.5rem 1.5rem 1.25rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  text-align: center;
  max-width: 380px;
  width: 100%;
}

.login-title {
  font-size: 1.25rem;
  font-weight: 700;
  background: linear-gradient(135deg, #6366f1, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.25rem;
}

.login-subtitle {
  color: #94a3b8;
  margin-bottom: 1rem;
  font-size: 0.85rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.login-input {
  width: 100%;
  padding: 0.75rem;
  background: #0f172a;
  border: 2px solid #334155;
  border-radius: 10px;
  color: #f1f5f9;
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s;
}

.login-input:focus {
  border-color: #6366f1;
}

.login-btn {
  width: 100%;
  padding: 0.75rem;
  background: linear-gradient(135deg, #6366f1, #a855f7);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(99, 102, 241, 0.3);
}

.login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
