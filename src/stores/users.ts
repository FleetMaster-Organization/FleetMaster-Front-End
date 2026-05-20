import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AppUser, UserFormData, UserRole, UserStatus } from '@/types'
import { useAuditStore } from '@/stores/audit'
import { api } from '@/utils/api'

const ROLE_MAP: Record<UserRole, string> = {
    admin: 'ff4b650b-9765-4859-9545-fe28f168d60c',
    coordinator: 'dd34042b-f399-48a9-a6ef-688df176dbe9',
    dispatcher: '9b56ce70-d44e-4006-92aa-fbd86bfd6087',
    mechanic: '345625ce-b6c0-4a06-96ec-b4fdbc6e14c8',
}

function mapBackendRoleToFrontend(roles: string[]): UserRole {
    if (!roles || roles.length === 0) return 'dispatcher'
    const role = roles[0]
    if (role === 'ROLE_ADMINISTRADOR') return 'admin'
    if (role === 'ROLE_COORDINADOR') return 'coordinator'
    if (role === 'ROLE_MECANICO') return 'mechanic'
    return 'dispatcher'
}

export const useUsersStore = defineStore('users', () => {
    const auditStore = useAuditStore()
    const users = ref<AppUser[]>([])
    const isLoading = ref(false)

    const activos   = computed(() => users.value.filter(u => u.estado === 'Activo'))
    const inactivos = computed(() => users.value.filter(u => u.estado === 'Inactivo'))
    const porRol    = (rol: UserRole) => computed(() => users.value.filter(u => u.rol === rol))

    async function loadUsers() {
        isLoading.value = true
        try {
            const res = await api.get<any[]>('/admin/users')
            const list = res.data || []
            users.value = list.map((item: any) => ({
                id: item.idUser,
                nombreCompleto: item.fullName,
                email: item.email,
                passwordHash: '',
                rol: mapBackendRoleToFrontend(item.roles),
                estado: item.enabled ? 'Activo' : 'Inactivo',
                creadoEn: new Date().toISOString(),
                actualizadoEn: new Date().toISOString()
            }))
        } catch (error) {
            console.error('Error loading users:', error)
        } finally {
            isLoading.value = false
        }
    }

    async function createUser(data: UserFormData): Promise<{ success: boolean; error?: string }> {
        try {
            const roleId = ROLE_MAP[data.rol]
            await api.post('/admin/users', {
                fullName: data.nombreCompleto,
                email: data.email,
                password: data.password,
                roleId: roleId
            })

            await loadUsers()

            auditStore.log({
                usuario: 'Admin',
                accion: 'CREAR_USUARIO',
                entidad: `Usuario ${data.nombreCompleto}`,
                detalle: `Cuenta creada con rol ${data.rol}`,
            })
            return { success: true }
        } catch (error: any) {
            console.error('Error creating user:', error)
            const msg = error.response?.data?.message || 'Error al crear el usuario en el servidor.'
            return { success: false, error: msg }
        }
    }

    async function updateUser(
        id: string,
        data: Omit<UserFormData, 'password'> & { password?: string }
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const roleId = ROLE_MAP[data.rol]
            await api.put(`/admin/users/${id}`, {
                fullName: data.nombreCompleto,
                email: data.email,
                roleId: roleId
            })

            if (data.password) {
                await api.patch(`/admin/users/${id}/reset-password`, {
                    newPassword: data.password
                })
            }

            const user = users.value.find(u => u.id === id)
            if (user && user.estado !== data.estado) {
                const action = data.estado === 'Activo' ? 'enable' : 'disable'
                await api.patch(`/admin/users/${id}/${action}`)
            }

            await loadUsers()

            auditStore.log({
                usuario: 'Admin',
                accion: 'EDITAR_USUARIO',
                entidad: `Usuario ${data.nombreCompleto}`,
                detalle: 'Información de usuario actualizada en el servidor',
            })
            return { success: true }
        } catch (error: any) {
            console.error('Error updating user:', error)
            const msg = error.response?.data?.message || 'Error al actualizar el usuario.'
            return { success: false, error: msg }
        }
    }

    async function toggleStatus(id: string, accion: 'activar' | 'desactivar'): Promise<{ success: boolean; error?: string }> {
        try {
            const actionPath = accion === 'activar' ? 'enable' : 'disable'
            await api.patch(`/admin/users/${id}/${actionPath}`)
            
            await loadUsers()

            const user = users.value.find(u => u.id === id)
            auditStore.log({
                usuario: 'Admin',
                accion: accion === 'activar' ? 'ACTIVAR_USUARIO' : 'DESACTIVAR_USUARIO',
                entidad: `Usuario ${user?.nombreCompleto || id}`,
                detalle: `Cuenta ${accion === 'activar' ? 'activada' : 'desactivada'} por administrador`,
            })
            return { success: true }
        } catch (error: any) {
            console.error('Error toggling user status:', error)
            const msg = error.response?.data?.message || 'Error al cambiar estado del usuario.'
            return { success: false, error: msg }
        }
    }

    return {
        users, activos, inactivos, porRol, isLoading,
        loadUsers, createUser, updateUser, toggleStatus,
    }
})