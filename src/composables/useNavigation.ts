import type { NavItem } from '@/types'
import type { UserRole } from '@/stores/auth'

const adminNav: NavItem[] = [
    { label: 'Dashboard',    icon: 'grid',      to: '/admin/dashboard'    },
    { label: 'Vehículos',    icon: 'truck',     to: '/admin/vehiculos'    },
    { label: 'Conductores',  icon: 'users',     to: '/admin/conductores'  },
    { label: 'Asignaciones', icon: 'link',      to: '/admin/asignaciones' },
    { label: 'Mantenimiento',icon: 'wrench',    to: '/admin/mantenimiento'},
    { label: 'Alertas',      icon: 'bell',      to: '/admin/alertas'      },
    { label: 'Auditoría',    icon: 'file-text', to: '/admin/auditoria'    },
    { label: 'Usuarios',     icon: 'user-cog',  to: '/admin/usuarios'     },
]

const coordinatorNav: NavItem[] = [
    { label: 'Dashboard',    icon: 'grid',  to: '/coordinator/dashboard'   },
    { label: 'Vehículos',    icon: 'truck', to: '/coordinator/vehiculos'   },
    { label: 'Conductores',  icon: 'users', to: '/coordinator/conductores' },
    { label: 'Asignaciones', icon: 'link',  to: '/coordinator/asignaciones'},
    { label: 'Alertas',      icon: 'bell',  to: '/coordinator/alertas'     },
]

const mechanicNav: NavItem[] = [
    { label: 'Dashboard',    icon: 'grid',      to: '/mechanic/dashboard'   },
    { label: 'Mantenimiento',icon: 'wrench',    to: '/mechanic/mantenimiento'},
    { label: 'Historial',    icon: 'file-text', to: '/mechanic/historial'   },
]

// El despachador tiene una sola vista que integra asignaciones activas
// e historial en tabs — no necesita ítems separados en el sidebar.
const dispatcherNav: NavItem[] = [
    { label: 'Control de Despacho', icon: 'link', to: '/dispatcher/dashboard' },
]

export const navByRole: Record<UserRole, NavItem[]> = {
    admin:       adminNav,
    coordinator: coordinatorNav,
    mechanic:    mechanicNav,
    dispatcher:  dispatcherNav,
}