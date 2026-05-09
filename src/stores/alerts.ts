import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SystemAlert, AlertStatus, AlertDocType } from '@/types'
import { useVehiclesStore } from '@/stores/vehicles'
import { useDriversStore }  from '@/stores/drivers'
import { useAuditStore }    from '@/stores/audit'

function diffDays(isoDate: string): number {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    return Math.ceil((new Date(isoDate).getTime() - hoy.getTime()) / 86400000)
}

function genId() {
    return 'al' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4)
}

export const useAlertsStore = defineStore('alerts', () => {
    const vehiclesStore = useVehiclesStore()
    const driversStore  = useDriversStore()

    const managedIds = ref<Set<string>>(new Set())   // IDs marcados como gestionados
    const gestionMetadata = ref<Record<string, { en: string; por: string }>>({})

  // REQ-36/37: calcular alertas en tiempo real desde los stores
    const alerts = computed<SystemAlert[]>(() => {
    const result: SystemAlert[] = []

    // Vehículos — SOAT
    for (const v of vehiclesStore.vehicles) {
        if (v.estado === 'Vendido') continue
        const dias = diffDays(v.fechaVencimientoSoat)
        if (dias <= 30) {
        const id = `soat-${v.id}`
        const gestionada = managedIds.value.has(id)
        // REQ-39: revertir si sigue vencido
        const estadoFinal: AlertStatus =
            gestionada && dias < 0 ? 'Pendiente'
            : gestionada ? 'Gestionada'
            : 'Pendiente'
        if (gestionada && dias < 0) managedIds.value.delete(id)

        result.push({
            id,
            tipo: 'SOAT',
            severidad: dias < 0 ? 'Vencido' : 'Por vencer',
            estado: estadoFinal,
            entidadTipo: 'vehiculo',
            entidadId: v.id,
            entidadNombre: v.placa,
            fechaVencimiento: v.fechaVencimientoSoat,
            diasRestantes: dias,
            gestionadaEn: gestionMetadata.value[id]?.en ?? null,
            gestionadaPor: gestionMetadata.value[id]?.por ?? null,
        })
        }
    }

    // Vehículos — Tecnomecánica
    for (const v of vehiclesStore.vehicles) {
        if (v.estado === 'Vendido') continue
        const dias = diffDays(v.fechaVencimientoTecnomecanica)
        if (dias <= 30) {
            const id = `tecno-${v.id}`
            const gestionada = managedIds.value.has(id)
            const estadoFinal: AlertStatus =
            gestionada && dias < 0 ? 'Pendiente'
            : gestionada ? 'Gestionada'
            : 'Pendiente'
            if (gestionada && dias < 0) managedIds.value.delete(id)

            result.push({
            id,
            tipo: 'Tecnomecánica',
            severidad: dias < 0 ? 'Vencido' : 'Por vencer',
            estado: estadoFinal,
            entidadTipo: 'vehiculo',
            entidadId: v.id,
            entidadNombre: v.placa,
            fechaVencimiento: v.fechaVencimientoTecnomecanica,
            diasRestantes: dias,
            gestionadaEn: gestionMetadata.value[id]?.en ?? null,
            gestionadaPor: gestionMetadata.value[id]?.por ?? null,
            })
        }
    }

    // Conductores — Licencia
    for (const d of driversStore.drivers) {
        if (d.estado === 'Inactivo') continue
        const dias = diffDays(d.fechaVencimientoLicencia)
        if (dias <= 30) {
            const id = `lic-${d.id}`
            const gestionada = managedIds.value.has(id)
            const estadoFinal: AlertStatus =
            gestionada && dias < 0 ? 'Pendiente'
            : gestionada ? 'Gestionada'
            : 'Pendiente'
            if (gestionada && dias < 0) managedIds.value.delete(id)

            result.push({
            id,
            tipo: 'Licencia de conducción',
            severidad: dias < 0 ? 'Vencido' : 'Por vencer',
            estado: estadoFinal,
            entidadTipo: 'conductor',
            entidadId: d.id,
            entidadNombre: d.nombre,
            fechaVencimiento: d.fechaVencimientoLicencia,
            diasRestantes: dias,
            gestionadaEn: gestionMetadata.value[id]?.en ?? null,
            gestionadaPor: gestionMetadata.value[id]?.por ?? null,
            })
        }
    }

    return result.sort((a, b) => a.diasRestantes - b.diasRestantes)
})

  // Getters
    const pendientes  = computed(() => alerts.value.filter(a => a.estado === 'Pendiente'))
    const gestionadas = computed(() => alerts.value.filter(a => a.estado === 'Gestionada'))
    const criticas    = computed(() => pendientes.value.filter(a => a.severidad === 'Vencido'))
    const advertencias = computed(() => pendientes.value.filter(a => a.severidad === 'Por vencer'))

  // REQ-38: marcar como gestionada
    function markManaged(id: string, usuario: string): { success: boolean } {
        managedIds.value.add(id)
        gestionMetadata.value[id] = { en: new Date().toISOString(), por: usuario }

        // REQ-41: log de auditoría
        const alert = alerts.value.find(a => a.id === id)
        if (alert) {
        const auditStore = useAuditStore()
        auditStore.log({
            usuario,
            accion: 'GESTIONAR_ALERTA',
            entidad: alert.entidadNombre,
            detalle: `Alerta de ${alert.tipo} marcada como Gestionada`,
        })
        }
        return { success: true }
    }

    return {
        alerts,
        pendientes,
        gestionadas,
        criticas,
        advertencias,
        markManaged,
    }
})