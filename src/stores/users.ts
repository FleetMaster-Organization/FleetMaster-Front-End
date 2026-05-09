import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AppUser, UserFormData, UserRole, UserStatus } from '@/types'
import { useAuditStore } from '@/stores/audit'

// Simulación de hash — en producción usar bcrypt
function fakeHash(password: string): string {
    return btoa(password + ':fleetmaster_salt')
}

export const useUsersStore = defineStore('users', () => {
    const auditStore = useAuditStore()

    const users = ref<AppUser[]>([
        {
        id: 'u001', nombreCompleto: 'Ali Baba', email: 'admin@logifast.com',
        passwordHash: fakeHash('admin123'), rol: 'Administrador',
        estado: 'Activo', creadoEn: '2024-01-01T08:00:00Z', actualizadoEn: '2024-01-01T08:00:00Z',
        },
        {
        id: 'u002', nombreCompleto: 'Laura Coordinadora', email: 'laura@logifast.com',
        passwordHash: fakeHash('coord456'), rol: 'Coordinador de flota',
        estado: 'Activo', creadoEn: '2024-01-15T09:00:00Z', actualizadoEn: '2024-03-10T10:00:00Z',
        },
        {
        id: 'u003', nombreCompleto: 'Técnico Juan', email: 'juan.tec@logifast.com',
        passwordHash: fakeHash('mec789'), rol: 'Mecánico',
        estado: 'Activo', creadoEn: '2024-02-01T08:00:00Z', actualizadoEn: '2024-02-01T08:00:00Z',
        },
        {
        id: 'u004', nombreCompleto: 'Despachador Carlos', email: 'carlos.desp@logifast.com',
        passwordHash: fakeHash('desp000'), rol: 'Despachador',
        estado: 'Activo', creadoEn: '2024-02-10T07:30:00Z', actualizadoEn: '2024-04-01T09:00:00Z',
        },
        {
        id: 'u005', nombreCompleto: 'Técnico Ramírez', email: 'ramirez.tec@logifast.com',
        passwordHash: fakeHash('mec321'), rol: 'Mecánico',
        estado: 'Activo', creadoEn: '2024-03-05T10:00:00Z', actualizadoEn: '2024-03-05T10:00:00Z',
        },
        {
        id: 'u006', nombreCompleto: 'Coordinador1', email: 'coord1@logifast.com',
        passwordHash: fakeHash('coord111'), rol: 'Coordinador de flota',
        estado: 'Activo', creadoEn: '2024-03-20T08:00:00Z', actualizadoEn: '2024-03-20T08:00:00Z',
        },
        {
        id: 'u007', nombreCompleto: 'Técnico Gómez', email: 'gomez.tec@logifast.com',
        passwordHash: fakeHash('mec654'), rol: 'Mecánico',
        estado: 'Inactivo', creadoEn: '2024-04-01T09:00:00Z', actualizadoEn: '2024-12-01T11:00:00Z',
        },
        {
        id: 'u008', nombreCompleto: 'Sandra Despachadora', email: 'sandra.desp@logifast.com',
        passwordHash: fakeHash('desp999'), rol: 'Despachador',
        estado: 'Activo', creadoEn: '2024-04-15T07:00:00Z', actualizadoEn: '2024-04-15T07:00:00Z',
        },
    ])

    const activos   = computed(() => users.value.filter(u => u.estado === 'Activo'))
    const inactivos = computed(() => users.value.filter(u => u.estado === 'Inactivo'))
    const porRol    = (rol: UserRole) => computed(() => users.value.filter(u => u.rol === rol))

    function generateId() {
        return 'u' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4)
    }

    function emailExists(email: string, excludeId?: string): boolean {
        return users.value.some(u => u.email === email && u.id !== excludeId)
    }

    function createUser(data: UserFormData): { success: boolean; error?: string } {
        if (emailExists(data.email))
        return { success: false, error: `El email "${data.email}" ya está en uso.` }

        const now = new Date().toISOString()
        const newUser: AppUser = {
        id: generateId(),
        nombreCompleto: data.nombreCompleto,
        email: data.email,
        passwordHash: fakeHash(data.password),
        rol: data.rol,
        estado: 'Activo',
        creadoEn: now,
        actualizadoEn: now,
        }
        users.value.unshift(newUser)

        auditStore.log({
        usuario: 'Admin',
        accion: 'CREAR_USUARIO',
        entidad: `Usuario ${data.nombreCompleto}`,
        detalle: `Cuenta creada con rol ${data.rol}`,
        })
        return { success: true }
    }

    function updateUser(
        id: string,
        data: Omit<UserFormData, 'password'> & { password?: string }
    ): { success: boolean; error?: string } {
        const idx = users.value.findIndex(u => u.id === id)
        if (idx === -1) return { success: false, error: 'Usuario no encontrado.' }
        if (emailExists(data.email, id))
        return { success: false, error: `El email "${data.email}" ya está en uso.` }

        const prev = users.value[idx]!
        const rolCambiado = prev.rol !== data.rol

        users.value[idx] = {
        ...prev,
        nombreCompleto: data.nombreCompleto,
        email: data.email,
        rol: data.rol,
        estado: data.estado,
        passwordHash: data.password ? fakeHash(data.password) : prev.passwordHash,
        actualizadoEn: new Date().toISOString(),
        }

        auditStore.log({
        usuario: 'Admin',
        accion: rolCambiado ? 'CAMBIAR_ROL' : 'EDITAR_USUARIO',
        entidad: `Usuario ${data.nombreCompleto}`,
        detalle: rolCambiado
            ? `Rol cambiado: ${prev.rol} → ${data.rol}`
            : 'Información de usuario actualizada',
        })
        return { success: true }
    }

    function toggleStatus(id: string, accion: 'activar' | 'desactivar'): { success: boolean; error?: string } {
        const idx = users.value.findIndex(u => u.id === id)
        if (idx === -1) return { success: false, error: 'Usuario no encontrado.' }

        const user = users.value[idx]!
        const nuevoEstado: UserStatus = accion === 'activar' ? 'Activo' : 'Inactivo'

        users.value[idx] = { ...user, estado: nuevoEstado, actualizadoEn: new Date().toISOString() }

        auditStore.log({
        usuario: 'Admin',
        accion: accion === 'activar' ? 'ACTIVAR_USUARIO' : 'DESACTIVAR_USUARIO',
        entidad: `Usuario ${user.nombreCompleto}`,
        detalle: `Cuenta ${nuevoEstado === 'Activo' ? 'activada' : 'desactivada'} por administrador`,
        })
        return { success: true }
    }

    return {
        users, activos, inactivos, porRol,
        emailExists, createUser, updateUser, toggleStatus,
    }
})