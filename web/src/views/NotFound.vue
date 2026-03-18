<template>
  <div class="not-found-page">
    <div class="not-found-content">
      <div class="error-code">404</div>
      <div class="error-title">页面未找到</div>
      <div class="error-description">抱歉，您访问的页面不存在</div>
      <button class="home-btn" @click="goHome">返回首页</button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}
</script>

<style scoped>
.not-found-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.not-found-content {
  text-align: center;
  padding: 2rem;
}

.error-code {
  font-size: 8rem;
  font-weight: 700;
  color: #6366f1;
  line-height: 1;
  margin-bottom: 1rem;
  text-shadow: 0 0 30px rgba(99, 102, 241, 0.3);
}

.error-title {
  font-size: 2rem;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 0.5rem;
}

.error-description {
  font-size: 1.1rem;
  color: #94a3b8;
  margin-bottom: 2rem;
}

.home-btn {
  padding: 0.75rem 2rem;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.home-btn:hover {
  background: #4f46e5;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

@media (max-width: 768px) {
  .error-code {
    font-size: 5rem;
  }

  .error-title {
    font-size: 1.5rem;
  }

  .error-description {
    font-size: 1rem;
  }

  .home-btn {
    padding: 0.6rem 1.5rem;
    font-size: 0.9rem;
  }
}
</style>
