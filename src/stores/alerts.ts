import { defineStore } from 'pinia'
import { watch, computed, reactive } from 'vue'
import type { SystemAlert, AlertStatus, AlertDocType } from '@/types'
import { useVehiclesStore } from '@/stores/vehicles'
import { useDriversStore }  from '@/stores/drivers'
import { useAuditStore }    from '@/stores/audit'

function diffDays(isoDate: string): number {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    return Math.ceil((new Date(isoDate).getTime() - hoy.getTime()) / 86400000)
}

export const useAlertsStore = defineStore('alerts', () => {
    const vehiclesStore = useVehiclesStore()
    const driversStore  = useDriversStore()

    const managedIds = reactive<Record<string, boolean>>({})
    const gestionMetadata = reactive<Record<string, { en: string; por: string }>>({})
    
    const alerts = computed<SystemAlert[]>(() => {
        const result: SystemAlert[] = []

        for (const v of vehiclesStore.vehicles) {
            if (v.estado === 'Vendido') continue
            const dias = diffDays(v.fechaVencimientoSoat)
            if (dias <= 30) {
                const id = `soat-${v.id}`
                const gestionada = !!managedIds[id]
                result.push({
                    id,
                    tipo: 'SOAT',
                    severidad: dias < 0 ? 'Vencido' : 'Por vencer',
                    estado: gestionada ? 'Gestionada' : 'Pendiente',
                    entidadTipo: 'vehiculo',
                    entidadId: v.id,
                    entidadNombre: v.placa,
                    fechaVencimiento: v.fechaVencimientoSoat,
                    diasRestantes: dias,
                    gestionadaEn: gestionMetadata[id]?.en ?? null,
                    gestionadaPor: gestionMetadata[id]?.por ?? null
                })
            }
        }

        for (const v of vehiclesStore.vehicles) {
            if (v.estado === 'Vendido') continue
            const dias = diffDays(v.fechaVencimientoTecnomecanica)
            if (dias <= 30) {
                const id = `tecno-${v.id}`
                const gestionada = !!managedIds[id]
                result.push({
                    id,
                    tipo: 'Tecnomecánica',
                    severidad: dias < 0 ? 'Vencido' : 'Por vencer',
                    estado: gestionada ? 'Gestionada' : 'Pendiente',
                    entidadTipo: 'vehiculo',
                    entidadId: v.id,
                    entidadNombre: v.placa,
                    fechaVencimiento: v.fechaVencimientoTecnomecanica,
                    diasRestantes: dias,
                    gestionadaEn: gestionMetadata[id]?.en ?? null,
                    gestionadaPor: gestionMetadata[id]?.por ?? null
                })
            }
        }

        for (const d of driversStore.drivers) {
            if (d.estado === 'Inactivo') continue
            const dias = diffDays(d.fechaVencimientoLicencia)
            if (dias <= 30) {
                const id = `lic-${d.id}`
                const gestionada = !!managedIds[id]
                result.push({
                    id,
                    tipo: 'Licencia de conducción',
                    severidad: dias < 0 ? 'Vencido' : 'Por vencer',
                    estado: gestionada ? 'Gestionada' : 'Pendiente',
                    entidadTipo: 'conductor',
                    entidadId: d.id,
                    entidadNombre: d.nombre,
                    fechaVencimiento: d.fechaVencimientoLicencia,
                    diasRestantes: dias,
                    gestionadaEn: gestionMetadata[id]?.en ?? null,
                    gestionadaPor: gestionMetadata[id]?.por ?? null
                })
            }
        }

        return result.sort((a, b) => a.diasRestantes - b.diasRestantes)
    })

    const pendientes   = computed(() => alerts.value.filter(a => a.estado === 'Pendiente'))
    const gestionadas  = computed(() => alerts.value.filter(a => a.estado === 'Gestionada'))
    const criticas     = computed(() => pendientes.value.filter(a => a.severidad === 'Vencido'))
    const advertencias = computed(() => pendientes.value.filter(a => a.severidad === 'Por vencer'))

    function markManaged(id: string, usuario: string): { success: boolean } {
        managedIds[id] = true
        gestionMetadata[id] = { en: new Date().toISOString(), por: usuario }
        
        // DEBUG TEMPORAL
        console.log('managedIds ahora:', JSON.stringify(managedIds))
        console.log('alerts total:', alerts.value.length)
        console.log('pendientes total:', pendientes.value.length)
        console.log('gestionadas total:', gestionadas.value.length)
        
        return { success: true }
    }

    watch(
        () => [...vehiclesStore.vehicles, ...driversStore.drivers],
        () => {
            // Limpiar IDs gestionados cuya fecha siga vencida
            for (const id of Object.keys(managedIds)) {
                const alert = alerts.value.find(a => a.id === id)
                if (alert && alert.diasRestantes < 0) {
                    delete managedIds[id]
                }
            }
        },
        { deep: true }
    )

    return {
        alerts,
        pendientes,
        gestionadas,
        criticas,
        advertencias,
        markManaged,
    }
})