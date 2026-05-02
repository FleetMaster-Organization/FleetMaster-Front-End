import { createRouter, createWebHistory } from 'vue-router'

// 👇 IMPORTAS la vista
import LoginView from '@/views/auth/LoginView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginView
    }
  ],
})

export default router