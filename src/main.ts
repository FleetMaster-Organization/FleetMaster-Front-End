import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'  

import App from './App.vue'
import router from './router'

import './assets/main.css'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia) 

const auth = useAuthStore()
auth.restoreSession()

if (!auth.isAuthenticated) {
    auth.login({ email: 'admin@fleetmaster.com', password: '1234' })
}

app.use(router)
app.mount('#app')