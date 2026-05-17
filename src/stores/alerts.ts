import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'
import type { SystemAlert, AlertDocType } from '@/types'
import { useVehiclesStore } from '@/stores/vehicles'
import { useDriversStore }  from '@/stores/drivers'
import { useAuditStore }    from '@/stores/audit'

// ── Helper ────────────────────────────────────────────────────
function diffDays(isoDate: string): number {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    return Math.ceil((new Date(isoDate).getTime() - hoy.getTime()) / 86400000)
}

export const useAlertsStore = defineStore('alerts', () => {
    const vehiclesStore = useVehiclesStore()
    const driversStore  = useDriversStore()
    const auditStore    = useAuditStore()

    // Metadatos de gestión (persisten en memoria durante la sesión)
    const managedIds      = reactive<Record<string, boolean>>({})
    const gestionMetadata = reactive<Record<string, { en: string; por: string }>>({})

    // ── Computed principal ────────────────────────────────────
    const alerts = computed<SystemAlert[]>(() => {
        const result: SystemAlert[] = []

        // ── Alertas de documentos de vehículos ────────────────
        // Ahora itera vehicle.documentos[] en lugar de campos planos.
        // Solo genera alerta si el vehículo no está Vendido.
        for (const v of vehiclesStore.vehicles) {
            if (v.estadoAdministrativo === 'Vendido') continue

            for (const doc of v.documentos) {
                const dias = diffDays(doc.fechaVencimiento)
                if (dias > 30) continue

                // ID único por vehículo + tipo de documento
                const id = `${doc.tipo.toLowerCase()}-${v.id}`
                const tipo: AlertDocType =
                    doc.tipo === 'SOAT' ? 'SOAT' : 'Tecnomecánica'

                result.push({
                    id,
                    tipo,
                    severidad:    dias < 0 ? 'Vencido' : 'Por vencer',
                    estado:       managedIds[id] ? 'Gestionada' : 'Pendiente',
                    entidadTipo:  'vehiculo',
                    entidadId:    v.id,
                    entidadNombre: v.placa,
                    fechaVencimiento: doc.fechaVencimiento,
                    diasRestantes:    dias,
                    gestionadaEn:  gestionMetadata[id]?.en  ?? null,
                    gestionadaPor: gestionMetadata[id]?.por ?? null,
                })
            }
        }

        // ── Alertas de licencias de conductores ───────────────
        // Ahora itera driver.licencias[] (múltiples categorías).
        // Genera una alerta por cada categoría de licencia que esté
        // vencida o por vencer, independientemente de las otras.
        // Solo genera alerta si el conductor no está RETIRADO.
        for (const d of driversStore.drivers) {
            if (d.estadoLaboral === 'RETIRADO') continue

            for (const lic of d.licencias) {
                const dias = diffDays(lic.fechaVencimiento)
                if (dias > 30) continue

                // ID único por conductor + categoría de licencia
                const id = `lic-${d.id}-${lic.categoria}`

                result.push({
                    id,
                    tipo: 'Licencia de conducción',
                    severidad:    dias < 0 ? 'Vencido' : 'Por vencer',
                    estado:       managedIds[id] ? 'Gestionada' : 'Pendiente',
                    entidadTipo:  'conductor',
                    entidadId:    d.id,
                    // Incluye la categoría para distinguir alertas del mismo conductor
                    entidadNombre: `${d.nombre} (Cat. ${lic.categoria})`,
                    fechaVencimiento: lic.fechaVencimiento,
                    diasRestantes:    dias,
                    gestionadaEn:  gestionMetadata[id]?.en  ?? null,
                    gestionadaPor: gestionMetadata[id]?.por ?? null,
                })
            }
        }

        // Ordenar: primero las más críticas (días más negativos o menores)
        return result.sort((a, b) => a.diasRestantes - b.diasRestantes)
    })

    // ── Computed derivados ────────────────────────────────────
    const pendientes   = computed(() => alerts.value.filter(a => a.estado === 'Pendiente'))
    const gestionadas  = computed(() => alerts.value.filter(a => a.estado === 'Gestionada'))
    const criticas     = computed(() => pendientes.value.filter(a => a.severidad === 'Vencido'))
    const advertencias = computed(() => pendientes.value.filter(a => a.severidad === 'Por vencer'))

    // ── Acciones ──────────────────────────────────────────────
    function markManaged(id: string, usuario: string): { ok: boolean } {
        managedIds[id] = true
        gestionMetadata[id] = {
            en:  new Date().toISOString(),
            por: usuario,
        }

        auditStore.log({
            accion: 'GESTIONAR_ALERTA',
            usuario,
            entidad: `Alerta ${id}`,
            detalle: 'Alerta marcada como gestionada',
        })

        return { ok: true }
    }

    /**
     * Limpia las marcas de gestión de alertas que ya no existen
     * en la lista actual (útil al renovar un documento o licencia).
     * Llamar desde el componente AlertasView al montar o al detectar cambios.
     */
    function cleanStaleManagedIds(): void {
        const activeIds = new Set(alerts.value.map(a => a.id))
        for (const id of Object.keys(managedIds)) {
            if (!activeIds.has(id)) {
                delete managedIds[id]
                delete gestionMetadata[id]
            }
        }
    }

    return {
        alerts,
        pendientes,
        gestionadas,
        criticas,
        advertencias,
        markManaged,
        cleanStaleManagedIds,
    }
})