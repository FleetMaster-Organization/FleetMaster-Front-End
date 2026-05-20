import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MaintenanceRecord, MaintenanceFormData, MaintenanceCloseData } from '@/types'
import { useVehiclesStore }    from '@/stores/vehicles'
import { useAssignmentsStore } from '@/stores/assignments'
import { useAuditStore }       from '@/stores/audit'

export const useMaintenanceStore = defineStore('maintenance', () => {
    const auditStore       = useAuditStore()
    const vehiclesStore    = useVehiclesStore()
    const assignmentsStore = useAssignmentsStore()

    // ── Estado ────────────────────────────────────────────────
    const records = ref<MaintenanceRecord[]>([
        {
            id: 'm001', vehiculoId: 'v1', vehiculoPlaca: 'ABC-123',
            vehiculoMarca: 'Chevrolet', vehiculoModelo: 'NPR',
            tipo: 'Correctivo',
            descripcion: 'Falla en sistema de frenos — cambio de pastillas y discos',
            fechaIngreso: '2025-04-25', fechaSalida: null,
            kilometrajeIngreso: 45000, kilometrajeSalida: null,
            costo: 850000, comentariosCierre: null,
            proximoMantenimiento: null, estado: 'Abierto', tecnico: 'Técnico Juan',
        },
        {
            id: 'm002', vehiculoId: 'v_hist_2', vehiculoPlaca: 'PQR-901',
            vehiculoMarca: 'Kenworth', vehiculoModelo: 'T680',
            tipo: 'Preventivo',
            descripcion: 'Cambio de aceite y filtros — mantenimiento programado 240k km',
            fechaIngreso: '2025-04-20', fechaSalida: '2025-04-21',
            kilometrajeIngreso: 239800, kilometrajeSalida: 239800,
            costo: 1200000,
            comentariosCierre: 'Aceite y filtros reemplazados. Próximo a los 300k km.',
            proximoMantenimiento: '2025-10-20', estado: 'Cerrado', tecnico: 'Técnico Ramírez',
        },
        {
            id: 'm003', vehiculoId: 'v_hist_3', vehiculoPlaca: 'MNO-678',
            vehiculoMarca: 'Mercedes-Benz', vehiculoModelo: 'Sprinter',
            tipo: 'Preventivo',
            descripcion: 'Cambio de correa de distribución y bomba de agua',
            fechaIngreso: '2025-01-08', fechaSalida: '2025-01-09',
            kilometrajeIngreso: 62000, kilometrajeSalida: 62000,
            costo: 1850000,
            comentariosCierre: 'Trabajo completado sin inconvenientes.',
            proximoMantenimiento: '2025-07-08', estado: 'Cerrado', tecnico: 'Técnico Ramírez',
        },
    ])

    // ── Getters ───────────────────────────────────────────────
    const abiertos = computed(() => records.value.filter(r => r.estado === 'Abierto'))
    const cerrados = computed(() => records.value.filter(r => r.estado === 'Cerrado'))
    const porVehiculo = (vehiculoId: string) =>
        computed(() => records.value.filter(r => r.vehiculoId === vehiculoId))

    // ── Helpers ───────────────────────────────────────────────
    function generateId(): string {
        return 'm' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7)
    }

    function todayStr(): string {
        return new Date().toISOString().split('T')[0]!
    }

    // ── Acciones ──────────────────────────────────────────────

    function openMaintenance(
        data: MaintenanceFormData,
    ): { success: boolean; error?: string } {
        const vehicle = vehiclesStore.vehicles.find(v => v.id === data.vehiculoId)
        if (!vehicle) return { success: false, error: 'Vehículo no encontrado.' }

        // REQ-30: fecha de ingreso no puede ser futura
        if (data.fechaIngreso > todayStr())
            return { success: false, error: 'La fecha de ingreso no puede ser futura.' }

        // REQ-31: bloquear si tiene asignación activa
        const tieneAsignacion = assignmentsStore.activas.some(
            a => a.vehiculoId === data.vehiculoId,
        )
        if (tieneAsignacion)
            return {
                success: false,
                error: `El vehículo ${vehicle.placa} tiene una asignación activa. Finalízala antes de ingresar a mantenimiento.`,
            }

        // Bloquear si ya tiene un mantenimiento abierto
        const tieneMantenimiento = abiertos.value.some(r => r.vehiculoId === data.vehiculoId)
        if (tieneMantenimiento)
            return {
                success: false,
                error: `El vehículo ${vehicle.placa} ya tiene un registro de mantenimiento abierto.`,
            }

        const newRecord: MaintenanceRecord = {
            ...data,
            id:                  generateId(),
            vehiculoPlaca:       vehicle.placa,
            vehiculoMarca:       vehicle.marca,
            vehiculoModelo:      vehicle.modelo,
            fechaSalida:         null,
            kilometrajeIngreso:  vehicle.kilometraje, // REQ-32: km actual como referencia
            kilometrajeSalida:   null,
            comentariosCierre:   null,
            proximoMantenimiento: null,
            estado:              'Abierto',
        }
        records.value.unshift(newRecord)

        // REQ-32: cambiar estado operativo del vehículo
        vehiclesStore.setOperationalStatus(vehicle.id, 'En mantenimiento')

        auditStore.log({
            accion: 'ABRIR_MANTENIMIENTO',
            usuario: 'ROLE_ADMINISTRADOR',
            entidad: `Vehículo ${vehicle.placa}`,
            detalle: `Mantenimiento ${data.tipo} abierto — ${data.descripcion} | Técnico: ${data.tecnico}`,
        })

        return { success: true }
    }

    function closeMaintenance(
        id: string,
        data: MaintenanceCloseData,
    ): { success: boolean; error?: string } {
        const idx = records.value.findIndex(r => r.id === id)
        if (idx === -1) return { success: false, error: 'Registro no encontrado.' }

        const record = records.value[idx]!

        // REQ-35: fecha próximo mantenimiento no puede ser pasada
        if (data.proximoMantenimiento && data.proximoMantenimiento < todayStr())
            return {
                success: false,
                error: 'La fecha del próximo mantenimiento debe ser igual o posterior al día de hoy.',
            }

        records.value[idx] = {
            ...record,
            fechaSalida:          data.fechaSalida,
            kilometrajeSalida:    data.kilometrajeSalida,
            comentariosCierre:    data.comentariosCierre    ?? null,
            proximoMantenimiento: data.proximoMantenimiento ?? null,
            estado:               'Cerrado',
        }

        // REQ-33: vehículo vuelve a Disponible usando método del store
        vehiclesStore.setOperationalStatus(record.vehiculoId, 'Disponible')

        auditStore.log({
            accion: 'CERRAR_MANTENIMIENTO',
            usuario: 'ROLE_ADMINISTRADOR',
            entidad: `Vehículo ${record.vehiculoPlaca}`,
            detalle: `Mantenimiento cerrado. Km salida: ${data.kilometrajeSalida}${
                data.comentariosCierre ? ` — ${data.comentariosCierre}` : ''
            }`,
        })

        return { success: true }
    }

    // REQ-34/35: programar próximo mantenimiento sin cambiar estado
    function scheduleNext(
        id: string,
        fecha: string,
    ): { success: boolean; error?: string } {
        if (fecha < todayStr())
            return { success: false, error: 'La fecha debe ser igual o posterior al día de hoy.' }

        const idx = records.value.findIndex(r => r.id === id)
        if (idx === -1) return { success: false, error: 'Registro no encontrado.' }

        records.value[idx] = { ...records.value[idx]!, proximoMantenimiento: fecha }
        return { success: true }
    }

    return {
        records,
        abiertos,
        cerrados,
        porVehiculo,
        openMaintenance,
        closeMaintenance,
        scheduleNext,
    }
})