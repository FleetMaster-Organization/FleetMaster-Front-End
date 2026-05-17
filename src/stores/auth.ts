import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

export type UserRole = 'admin' | 'coordinator' | 'mechanic' | 'dispatcher'

export interface User {
    id: string
    name: string
    email: string
    role: UserRole
    avatar?: string
}

export const ROLE_REDIRECT: Record<UserRole, string> = {
    admin:       '/admin/dashboard',
    coordinator: '/coordinator/dashboard',
    mechanic:    '/mechanic/dashboard',
    dispatcher:  '/dispatcher/dashboard',
}

/** Tiempo de inactividad permitido antes del cierre automático de sesión (ms) */
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000

/** Eventos del DOM que se consideran actividad del usuario */
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
    'mousemove',
    'mousedown',
    'keydown',
    'touchstart',
    'scroll',
    'click',
]

export const useAuthStore = defineStore('auth', () => {
    const router = useRouter()

    const user  = ref<User | null>(null)
    const token = ref<string | null>(localStorage.getItem('token'))

    // ── Temporizador de inactividad ──────────────────────────
    let inactivityTimer: ReturnType<typeof setTimeout> | null = null

    function resetInactivityTimer() {
        if (inactivityTimer !== null) clearTimeout(inactivityTimer)
        inactivityTimer = setTimeout(() => logout(true), INACTIVITY_TIMEOUT_MS)
    }

    function startInactivityWatcher() {
        ACTIVITY_EVENTS.forEach(event =>
            window.addEventListener(event, resetInactivityTimer, { passive: true })
        )
        resetInactivityTimer()
    }

    function stopInactivityWatcher() {
        ACTIVITY_EVENTS.forEach(event =>
            window.removeEventListener(event, resetInactivityTimer)
        )
        if (inactivityTimer !== null) {
            clearTimeout(inactivityTimer)
            inactivityTimer = null
        }
    }

    // ── Computed ─────────────────────────────────────────────
    const isAuthenticated = computed(() => !!token.value && !!user.value)
    const userRole        = computed(() => user.value?.role ?? null)
    const dashboardRoute  = computed(() =>
        user.value ? ROLE_REDIRECT[user.value.role] : '/login'
    )

    // ── Acciones ─────────────────────────────────────────────

    /**
     * Login mock. Para probar distintos roles en desarrollo,
     * cambia el valor de `role` en mockUser.
     *
     * Roles disponibles: 'admin' | 'coordinator' | 'mechanic' | 'dispatcher'
     *
     * Ejemplo para probar el despachador:
     *   role: 'dispatcher'
     */
    function login(credentials: { email: string; password: string }) {
        // ─── MOCK: reemplazar con llamada real a API ───────────
        const mockUser: User = {
            id:    '1',
            name:  'Ali Baba',
            email: credentials.email,
            role:  'dispatcher', // cambia aquí para probar otros roles
        }
        const mockToken = 'mock-jwt-token'
        // ──────────────────────────────────────────────────────

        user.value  = mockUser
        token.value = mockToken
        localStorage.setItem('token', mockToken)
        localStorage.setItem('user', JSON.stringify(mockUser))

        startInactivityWatcher()
    }

    function logout(dueToInactivity = false) {
        stopInactivityWatcher()

        user.value  = null
        token.value = null
        localStorage.removeItem('token')
        localStorage.removeItem('user')

        if (dueToInactivity) {
            router.push({ path: '/login', query: { reason: 'inactivity' } })
        } else {
            router.push('/login')
        }
    }

    function restoreSession() {
        const stored = localStorage.getItem('user')
        if (stored && token.value) {
            user.value = JSON.parse(stored)
            startInactivityWatcher()
        }
    }

    return {
        user,
        token,
        isAuthenticated,
        userRole,
        dashboardRoute,
        login,
        logout,
        restoreSession,
    }
})