import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AuditLog, AuditAction } from '@/types'
import { api } from '@/utils/api'

export const useAuditStore = defineStore('audit', () => {
    const logs = ref<AuditLog[]>([])
    const isLoading = ref(false)

    // REQ-40: getters y filtros de consulta
    const byVehiculo  = (placa: string) =>
        computed(() => logs.value.filter(l => l.entidad.toLowerCase().includes(placa.toLowerCase())))
    const byConductor = (nombre: string) =>
        computed(() => logs.value.filter(l => l.entidad.toLowerCase().includes(nombre.toLowerCase())))
    const byFecha     = (desde: string, hasta: string) =>
        computed(() => logs.value.filter(l => l.fecha >= desde && l.fecha <= hasta + 'T23:59:59Z'))

    // Cargar logs reales desde el backend
    async function loadLogs() {
        isLoading.value = true
        try {
            const res = await api.get<any[]>('/admin/users/audit')
            logs.value = res.data.map((audit: any) => {
                let action: AuditAction = 'EDITAR_USUARIO'
                if (audit.actionType === 'CREATE') action = 'CREAR_USUARIO'
                else if (audit.actionType === 'UPDATE') {
                    if (audit.modifiedField === 'roles') action = 'CAMBIAR_ROL'
                    else action = 'EDITAR_USUARIO'
                }
                else if (audit.actionType === 'ENABLE') action = 'ACTIVAR_USUARIO'
                else if (audit.actionType === 'DISABLE') action = 'DESACTIVAR_USUARIO'

                return {
                    id: String(audit.idAudit),
                    fecha: audit.modifiedAt,
                    usuario: audit.modifiedBy,
                    accion: action,
                    entidad: `${audit.userFullName} (${audit.userEmail})`,
                    detalle: audit.modifiedField 
                        ? `Campo: ${audit.modifiedField} (Antes: ${audit.oldValue ?? '—'} -> Ahora: ${audit.newValue ?? '—'})`
                        : `Usuario creado/gestionado`,
                } as AuditLog
            })
        } catch (e) {
            console.error('Error loading audit logs:', e)
        } finally {
            isLoading.value = false
        }
    }

    // REQ-41: agregar log desde cualquier store (todavía útil para transacciones rápidas)
    function log(entry: Omit<AuditLog, 'id' | 'fecha'>) {
        logs.value.unshift({
            ...entry,
            id: 'log' + Date.now().toString(36),
            fecha: new Date().toISOString(),
        })
    }

    return { logs, isLoading, byVehiculo, byConductor, byFecha, log, loadLogs }
})