import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import router from '@/router'
import { api } from '@/utils/api'
import { useVehiclesStore } from '@/stores/vehicles'
import { useDriversStore } from '@/stores/drivers'
import { useAssignmentsStore } from '@/stores/assignments'
import { useUsersStore } from '@/stores/users'
import { useAuditStore } from '@/stores/audit'

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
    const user  = ref<User | null>(null)
    const token = ref<string | null>(localStorage.getItem('token'))
    const isBootstrapping = ref(false)

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

    function mapRole(backendRoles: string[]): UserRole {
        if (backendRoles.includes('ROLE_ADMINISTRADOR')) return 'admin'
        if (backendRoles.includes('ROLE_COORDINADOR') || backendRoles.includes('ROLE_COORDINADOR_FLOTA')) return 'coordinator'
        if (backendRoles.includes('ROLE_MECANICO')) return 'mechanic'
        if (backendRoles.includes('ROLE_DESPACHADOR')) return 'dispatcher'
        return 'dispatcher'
    }

    async function bootstrapSessionData() {
        if (!user.value || isBootstrapping.value) return

        isBootstrapping.value = true
        try {
            const vehiclesStore = useVehiclesStore()
            const driversStore = useDriversStore()
            const assignmentsStore = useAssignmentsStore()

            await Promise.all([
                vehiclesStore.loadVehicles(),
                driversStore.loadDrivers(),
            ])
            await assignmentsStore.loadAssignments()

            if (user.value.role === 'admin') {
                const usersStore = useUsersStore()
                const auditStore = useAuditStore()
                await Promise.all([
                    usersStore.loadUsers(),
                    auditStore.loadLogs()
                ])
            }
        } catch (e) {
            console.error('Error loading session data:', e)
        } finally {
            isBootstrapping.value = false
        }
    }

    async function login(credentials: { email: string; password: string }): Promise<void> {
        // Clear any old/existing session to prevent stale states on failed logins
        user.value = null
        token.value = null
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')

        const response = await api.post<{
            accessToken: string
            refreshToken: string
            idUser: string
            email: string
            roles: string[]
        }>('/auth/login', credentials)

        const data = response.data
        const role = mapRole(data.roles)

        const loggedUser: User = {
            id: data.idUser,
            name: data.email.split('@')[0] || 'Usuario',
            email: data.email,
            role: role,
        }

        user.value  = loggedUser
        token.value = data.accessToken
        localStorage.setItem('token', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        localStorage.setItem('user', JSON.stringify(loggedUser))

        startInactivityWatcher()
        await bootstrapSessionData()
        await router.push(ROLE_REDIRECT[role])
    }

    async function logout(dueToInactivity = false) {
        const rt = localStorage.getItem('refreshToken')
        if (rt) {
            try {
                await api.post('/auth/logout', {}, {
                    headers: {
                        'Refresh-Token': rt,
                    },
                })
            } catch (e) {
                console.error('Logout error on backend:', e)
            }
        }

        stopInactivityWatcher()

        user.value  = null
        token.value = null
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
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
            if (!user.value) {
                user.value = JSON.parse(stored)
                startInactivityWatcher()

                void bootstrapSessionData()
            }
        }
    }

    return {
        user,
        token,
        isBootstrapping,
        isAuthenticated,
        userRole,
        dashboardRoute,
        login,
        logout,
        restoreSession,
        bootstrapSessionData,
    }
})