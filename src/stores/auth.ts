import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type UserRole = 'admin' | 'coordinator' | 'mechanic' | 'dispatcher'

export interface User {
    id: string
    name: string
    email: string
    role: UserRole
    avatar?: string
}

export const ROLE_REDIRECT: Record<UserRole, string> = {
    admin: '/admin/dashboard',
    coordinator: '/coordinator/dashboard',
    mechanic: '/mechanic/dashboard',
    dispatcher: '/dispatcher/dashboard',
}

export const useAuthStore = defineStore('auth', () => {
    const user = ref<User | null>(null)
    const token = ref<string | null>(localStorage.getItem('token'))

    const isAuthenticated = computed(() => !!token.value && !!user.value)
    const userRole = computed(() => user.value?.role ?? null)
    const dashboardRoute = computed(() =>
        user.value ? ROLE_REDIRECT[user.value.role] : '/login'
    )

    function login(credentials: { email: string; password: string }) {
        // Simulación de login — reemplazar con llamada real a API
        const mockUser: User = {
        id: '1',
        name: 'Ali Baba',
        email: credentials.email,
        role: 'admin',
        }
        const mockToken = 'mock-jwt-token'

        user.value = mockUser
        token.value = mockToken
        localStorage.setItem('token', mockToken)
        localStorage.setItem('user', JSON.stringify(mockUser))
    }

    function logout() {
        user.value = null
        token.value = null
        localStorage.removeItem('token')
        localStorage.removeItem('user')
    }

    function restoreSession() {
        const stored = localStorage.getItem('user')
        if (stored && token.value) {
        user.value = JSON.parse(stored)
        }
    }

    return { user, token, isAuthenticated, userRole, dashboardRoute, login, logout, restoreSession }
})