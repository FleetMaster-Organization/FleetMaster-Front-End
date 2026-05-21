import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { SystemAlert, AlertDocType, AlertSeverity, AlertStatus } from '@/types'
import { useVehiclesStore } from '@/stores/vehicles'
import { useDriversStore }  from '@/stores/drivers'
import { api } from '@/utils/api'

export const useAlertsStore = defineStore('alerts', () => {
    const vehiclesStore = useVehiclesStore()
    const driversStore  = useDriversStore()

    const rawAlerts = ref<any[]>([])
    const isLoading = ref(false)

    // Cargar alertas desde el microservicio backend
    async function loadAlerts() {
        isLoading.value = true
        try {
            const res = await api.get<any[]>('/alerts')
            rawAlerts.value = res.data || []
        } catch (error) {
            console.error('Error al cargar alertas del backend:', error)
        } finally {
            isLoading.value = false
        }
    }

    // Mapeo dinámico y reactivo de AlertResponse a SystemAlert
    const alerts = computed<SystemAlert[]>(() => {
        return rawAlerts.value.map((item: any) => {
            const entType = (item.entityType === 'VEHICLE' || item.entityType === 'VEHICULO') ? 'vehiculo' : 'conductor'
            
            let name = 'Desconocido'
            if (entType === 'vehiculo') {
                const v = vehiclesStore.vehicles.find(x => x.id === item.entityId)
                name = v ? v.placa : `Vehículo [${item.entityId.substring(0, 8)}]`
            } else {
                const d = driversStore.drivers.find(x => x.id === item.entityId)
                name = d ? d.nombre : `Conductor [${item.entityId.substring(0, 8)}]`
            }

            let docType: AlertDocType = 'SOAT'
            if (item.documentType === 'TECNO' || item.documentType === 'TECNOMECANICA') {
                docType = 'Tecnomecánica'
            } else if (item.documentType === 'LICENCIA' || item.documentType === 'LICENCIA_CONDUCCION') {
                docType = 'Licencia de conducción'
            }

            const sev: AlertSeverity = (item.criticality === 'CRITICAL' || item.criticality === 'VENCIDO' || item.daysUntilExpiration < 0) ? 'Vencido' : 'Por vencer'
            const est: AlertStatus = (item.status === 'PENDIENTE' || item.status === 'PENDING') ? 'Pendiente' : 'Gestionada'

            return {
                id: item.id.toString(),
                tipo: docType,
                severidad: sev,
                estado: est,
                entidadTipo: entType,
                entidadId: item.entityId,
                entidadNombre: name,
                fechaVencimiento: item.expirationDate,
                diasRestantes: item.daysUntilExpiration,
                gestionadaEn: item.resolvedAt || null,
                gestionadaPor: item.resolvedBy || null
            }
        })
    })

    // Getters y filtros requeridos por las vistas
    const pendientes   = computed(() => alerts.value.filter(a => a.estado === 'Pendiente'))
    const gestionadas  = computed(() => alerts.value.filter(a => a.estado === 'Gestionada'))
    const criticas     = computed(() => pendientes.value.filter(a => a.severidad === 'Vencido'))
    const advertencias = computed(() => pendientes.value.filter(a => a.severidad === 'Por vencer'))

    // Marcar una alerta como gestionada en el backend
    async function markManaged(id: string, usuario: string): Promise<{ success: boolean; error?: string }> {
        try {
            await api.patch(`/alerts/${id}/manage`, {
                resolvedBy: usuario
            })
            await loadAlerts()
            return { success: true }
        } catch (error: any) {
            console.error('Error al gestionar alerta:', error)
            return {
                success: false,
                error: error.response?.data?.message || 'Error al gestionar la alerta.'
            }
        }
    }

    // Mantener compatibilidad con llamadas existentes del ciclo de vida
    function cleanStaleManagedIds() {
        // No-op: Gestionado nativamente por el backend
    }

    return {
        alerts,
        pendientes,
        gestionadas,
        criticas,
        advertencias,
        isLoading,
        loadAlerts,
        markManaged,
        cleanStaleManagedIds
    }
})