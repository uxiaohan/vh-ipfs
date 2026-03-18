import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Login from './views/Login.vue'
import Upload from './views/Upload.vue'
import Admin from './views/Admin.vue'
import NotFound from './views/NotFound.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: Login },
    { path: '/', component: Upload, meta: { requiresSiteLogin: true } },
    { path: '/admin', component: Admin, meta: { requiresSiteLogin: true } },
    { path: '/:pathMatch(.*)*', component: NotFound }
  ]
})

router.beforeEach(async (to, from, next) => {
  const siteToken = localStorage.getItem('site_token')
  
  if (to.meta.requiresSiteLogin) {
    try {
      const res = await fetch('/api/site-password-enabled')
      if (res.ok) {
        const json = await res.json()
        if (!json.enabled) {
          next()
          return
        }
      }
    } catch {
    }
    
    if (!siteToken) {
      next('/login')
      return
    }
    
    try {
      const res = await fetch('/api/site-verify', {
        headers: { authorization: `Bearer ${siteToken}` }
      })
      if (!res.ok) {
        localStorage.removeItem('site_token')
        next('/login')
        return
      }
    } catch {
      localStorage.removeItem('site_token')
      next('/login')
      return
    }
  }
  
  if (to.path === '/login' && siteToken) {
    next('/')
    return
  }
  
  next()
})

console.log('')
console.log('🎨 IPFS Gallery Frontend')
console.log('📝 API: /api')
console.log('🌐 Gateway: /ipfs (proxied)')
console.log('')

createApp(App).use(router).mount('#app')
