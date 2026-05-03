import type { NavItem } from '@/types'
import type { UserRole } from '@/stores/auth'

const adminNav: NavItem[] = [
    { label: 'Dashboard', icon: 'grid', to: '/admin/dashboard' },
    {
        label: 'Vehículos', icon: 'truck',
        children: [
        { label: 'Lista de vehículos', to: '/admin/vehiculos' },
        { label: 'Agregar vehículo', to: '/admin/vehiculos/nuevo' },
        ],
    },
    {
        label: 'Conductores', icon: 'users',
        children: [
        { label: 'Lista de conductores', to: '/admin/conductores' },
        { label: 'Agregar conductor', to: '/admin/conductores/nuevo' },
        ],
    },
    { label: 'Asignaciones', icon: 'link', to: '/admin/asignaciones' },
    {
        label: 'Mantenimiento', icon: 'wrench',
        children: [
        { label: 'Órdenes activas', to: '/admin/mantenimiento' },
        { label: 'Historial', to: '/admin/mantenimiento/historial' },
        ],
    },
    {
        label: 'Alertas', icon: 'bell',
        children: [
        { label: 'Alertas activas', to: '/admin/alertas' },
        { label: 'Configurar', to: '/admin/alertas/config' },
        ],
    },
    { label: 'Auditoría', icon: 'file-text', to: '/admin/auditoria' },
    {
        label: 'Usuarios', icon: 'user-cog',
        children: [
        { label: 'Gestionar usuarios', to: '/admin/usuarios' },
        { label: 'Roles y permisos', to: '/admin/usuarios/roles' },
        ],
    },
]

const coordinatorNav: NavItem[] = [
    { label: 'Dashboard', icon: 'grid', to: '/coordinator/dashboard' },
    { label: 'Vehículos', icon: 'truck', to: '/coordinator/vehiculos' },
    { label: 'Conductores', icon: 'users', to: '/coordinator/conductores' },
    { label: 'Asignaciones', icon: 'link', to: '/coordinator/asignaciones' },
    { label: 'Alertas', icon: 'bell', to: '/coordinator/alertas' },
]

const mechanicNav: NavItem[] = [
    { label: 'Dashboard', icon: 'grid', to: '/mechanic/dashboard' },
    { label: 'Mantenimiento', icon: 'wrench', to: '/mechanic/mantenimiento' },
    { label: 'Historial', icon: 'file-text', to: '/mechanic/historial' },
]

const dispatcherNav: NavItem[] = [
    { label: 'Dashboard', icon: 'grid', to: '/dispatcher/dashboard' },
    { label: 'Asignaciones', icon: 'link', to: '/dispatcher/asignaciones' },
    { label: 'Vehículos', icon: 'truck', to: '/dispatcher/vehiculos' },
]

export const navByRole: Record<UserRole, NavItem[]> = {
    admin: adminNav,
    coordinator: coordinatorNav,
    mechanic: mechanicNav,
    dispatcher: dispatcherNav,
}