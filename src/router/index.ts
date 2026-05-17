import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore, ROLE_REDIRECT } from '@/stores/auth'
import type { UserRole } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ─── Auth ─────────────────────────────────────────────────
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { requiresGuest: true },
    },

    // ─── Admin ────────────────────────────────────────────────
    {
      path: '/admin',
      component: () => import('@/layouts/DashboardLayout.vue'),
      meta: { requiresAuth: true, role: 'admin' as UserRole },
      children: [
        {
          path: 'dashboard',
          name: 'admin-dashboard',
          component: () => import('@/views/admin/AdminDashboardView.vue'),
        },
        {
          path: '/admin/vehiculos',
          name: 'admin-vehiculos',
          component: () => import('@/views/admin/VehiculosView.vue'),
          meta: { requiresAuth: true, role: 'admin' as UserRole },
        },
        {
          path: '/admin/conductores',
          name: 'admin-conductores',
          component: () => import('@/views/admin/ConductoresView.vue'),
          meta: { requiresAuth: true, role: 'admin' as UserRole },
        },
        {
          path: 'asignaciones',
          name: 'admin-asignaciones',
          component: () => import('@/views/admin/AsignacionesView.vue'),
        },
        {
          path: '/admin/alertas',
          name: 'admin-alertas',
          component: () => import('@/views/admin/AlertasView.vue'),
          meta: { requiresAuth: true, role: 'admin' as UserRole },
        },
        {
          path: '/admin/auditoria',
          name: 'admin-auditoria',
          component: () => import('@/views/admin/AuditoriaView.vue'),
          meta: { requiresAuth: true, role: 'admin' as UserRole },
        },
        {
          path: '/admin/usuarios',
          name: 'admin-usuarios',
          component: () => import('@/views/admin/UsuariosView.vue'),
          meta: { requiresAuth: true, role: 'admin' as UserRole },
        },
        {
          path: 'mantenimiento',
          name: 'admin-mantenimiento',
          component: () => import('@/views/admin/MantenimientoView.vue'),
        },
      ],
    },

    // ─── Coordinator ──────────────────────────────────────────
    {
      path: '/coordinator',
      component: () => import('@/layouts/DashboardLayout.vue'),
      meta: { requiresAuth: true, role: 'coordinator' as UserRole },
      children: [
        {
          path: 'dashboard',
          name: 'coordinator-dashboard',
          component: () => import('@/views/coordinator/CoordinatorDashboardView.vue'),
        },
      ],
    },

    // ─── Mechanic ─────────────────────────────────────────────
    {
      path: '/mechanic',
      component: () => import('@/layouts/DashboardLayout.vue'),
      meta: { requiresAuth: true, role: 'mechanic' as UserRole },
      children: [
        {
          path: 'dashboard',
          name: 'mechanic-dashboard',
          component: () => import('@/views/mechanic/MechanicDashboardView.vue'),
        },
      ],
    },

    // ─── Dispatcher ───────────────────────────────────────────
    {
      path: '/dispatcher',
      component: () => import('@/layouts/DashboardLayout.vue'),
      meta: { requiresAuth: true, role: 'dispatcher' as UserRole },
      children: [
        {
          path: 'dashboard',
          name: 'dispatcher-dashboard',
          component: () => import('@/views/dispatcher/DispatcherDashboardView.vue'),
        },
      ],
    },

    // ─── Fallback ─────────────────────────────────────────────
    { path: '/', redirect: '/login' },
    { path: '/:pathMatch(.*)*', redirect: '/login' },
  ],
})

// ─── Navigation Guard ─────────────────────────────────────────
router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()
  auth.restoreSession()

  // Ruta protegida: debe estar autenticado
  if (to.meta.requiresAuth) {
    if (!auth.isAuthenticated) {
      return next('/login')
    }

    // Si la ruta tiene rol definido, verificar que coincida con el del usuario
    // El rol de la ruta padre aplica a todos sus hijos que no lo sobreescriban
    const requiredRole = to.meta.role as UserRole | undefined
    if (requiredRole && auth.userRole !== requiredRole) {
      // Redirigir al dashboard correcto del rol actual
      return next(ROLE_REDIRECT[auth.userRole!] ?? '/login')
    }
  }

  // Ruta de invitado: si ya está autenticado, ir al dashboard
  if (to.meta.requiresGuest && auth.isAuthenticated) {
    return next(auth.dashboardRoute)
  }

  next()
})

export default router