import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MaintenanceRecord, MaintenanceFormData, MaintenanceCloseData } from '@/types'
import { useVehiclesStore } from '@/stores/vehicles'
import { useAssignmentsStore } from '@/stores/assignments'
import { useAuditStore } from '@/stores/audit'

export const useMaintenanceStore = defineStore('maintenance', () => {
    const auditStore = useAuditStore()
    const vehiclesStore    = useVehiclesStore()
    const assignmentsStore = useAssignmentsStore()

    const records = ref<MaintenanceRecord[]>([
        {
        id: 'm001', vehiculoId: 'v002', vehiculoPlaca: 'XYZ-789',
        vehiculoMarca: 'Ford', vehiculoModelo: 'Transit',
        tipo: 'Correctivo', descripcion: 'Falla en sistema de frenos — cambio de pastillas y discos',
        fechaIngreso: '2025-04-25', fechaSalida: null,
        kilometrajeIngreso: 82100, kilometrajeSalida: null,
        costo: 850000, comentariosCierre: null,
        proximoMantenimiento: null, estado: 'Abierto', tecnico: 'Técnico Juan',
        },
        {
        id: 'm002', vehiculoId: 'v007', vehiculoPlaca: 'PQR-901',
        vehiculoMarca: 'Kenworth', vehiculoModelo: 'T680',
        tipo: 'Preventivo', descripcion: 'Cambio de aceite y filtros — mantenimiento programado 240k km',
        fechaIngreso: '2025-04-20', fechaSalida: null,
        kilometrajeIngreso: 239800, kilometrajeSalida: null,
        costo: 1200000, comentariosCierre: null,
        proximoMantenimiento: '2025-10-20', estado: 'Abierto', tecnico: 'Técnico Ramírez',
        },
        {
        id: 'm003', vehiculoId: 'v001', vehiculoPlaca: 'ABC-123',
        vehiculoMarca: 'Toyota', vehiculoModelo: 'Hilux',
        tipo: 'Revisión', descripcion: 'Revisión general pre-ruta — chequeo de fluidos y luces',
        fechaIngreso: '2025-03-10', fechaSalida: '2025-03-10',
        kilometrajeIngreso: 44500, kilometrajeSalida: 44500,
        costo: 120000, comentariosCierre: 'Todo en orden. Listo para operación.',
        proximoMantenimiento: '2025-09-10', estado: 'Cerrado', tecnico: 'Técnico Juan',
        },
        {
        id: 'm004', vehiculoId: 'v004', vehiculoPlaca: 'GHI-012',
        vehiculoMarca: 'Renault', vehiculoModelo: 'Master',
        tipo: 'Correctivo', descripcion: 'Cambio de batería y revisión alternador',
        fechaIngreso: '2025-02-14', fechaSalida: '2025-02-15',
        kilometrajeIngreso: 109500, kilometrajeSalida: 109500,
        costo: 450000, comentariosCierre: 'Batería reemplazada. Alternador en buen estado.',
        proximoMantenimiento: null, estado: 'Cerrado', tecnico: 'Técnico Gómez',
        },
        {
        id: 'm005', vehiculoId: 'v006', vehiculoPlaca: 'MNO-678',
        vehiculoMarca: 'Mercedes-Benz', vehiculoModelo: 'Sprinter',
        tipo: 'Preventivo', descripcion: 'Cambio de correa de distribución y bomba de agua',
        fechaIngreso: '2025-01-08', fechaSalida: '2025-01-09',
        kilometrajeIngreso: 62000, kilometrajeSalida: 62000,
        costo: 1850000, comentariosCierre: 'Trabajo completado sin inconvenientes.',
        proximoMantenimiento: '2025-07-08', estado: 'Cerrado', tecnico: 'Técnico Ramírez',
        },
        {
        id: 'm006', vehiculoId: 'v003', vehiculoPlaca: 'DEF-456',
        vehiculoMarca: 'Chevrolet', vehiculoModelo: 'NPR',
        tipo: 'Preventivo', descripcion: 'Cambio de aceite y filtro de aire',
        fechaIngreso: '2024-12-20', fechaSalida: '2024-12-20',
        kilometrajeIngreso: 18100, kilometrajeSalida: 18100,
        costo: 280000, comentariosCierre: 'Mantenimiento completado. Vehículo listo.',
        proximoMantenimiento: '2025-06-20', estado: 'Cerrado', tecnico: 'Técnico Juan',
        },
        {
        id: 'm007', vehiculoId: 'v005', vehiculoPlaca: 'JKL-345',
        vehiculoMarca: 'Honda', vehiculoModelo: 'CB500',
        tipo: 'Correctivo', descripcion: 'Cambio de llantas trasera y delantera',
        fechaIngreso: '2024-11-05', fechaSalida: '2024-11-05',
        kilometrajeIngreso: 4900, kilometrajeSalida: 4900,
        costo: 320000, comentariosCierre: 'Llantas nuevas instaladas.',
        proximoMantenimiento: null, estado: 'Cerrado', tecnico: 'Técnico Gómez',
        },
        {
        id: 'm008', vehiculoId: 'v009', vehiculoPlaca: 'VWX-567',
        vehiculoMarca: 'Hyundai', vehiculoModelo: 'H350',
        tipo: 'Revisión', descripcion: 'Inspección de frenos, suspensión y sistema eléctrico',
        fechaIngreso: '2024-10-18', fechaSalida: '2024-10-18',
        kilometrajeIngreso: 53800, kilometrajeSalida: 53800,
        costo: 95000, comentariosCierre: 'Sin novedades. Suspensión delantera con desgaste leve — monitorear.',
        proximoMantenimiento: '2025-04-18', estado: 'Cerrado', tecnico: 'Técnico Ramírez',
        },
    ])

    // ── Getters ────────────────────────────────────────────────
    const abiertos = computed(() => records.value.filter(r => r.estado === 'Abierto'))
    const cerrados = computed(() => records.value.filter(r => r.estado === 'Cerrado'))
    const porVehiculo = (vehiculoId: string) =>
        computed(() => records.value.filter(r => r.vehiculoId === vehiculoId))

    function generateId(): string {
        return 'm' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
    }

    function todayStr(): string {
        return new Date().toISOString().split('T')[0]!
    }

    // ── Acciones ───────────────────────────────────────────────
    function openMaintenance(data: MaintenanceFormData): { success: boolean; error?: string } {
        const vehicle = vehiclesStore.vehicles.find(v => v.id === data.vehiculoId)
        if (!vehicle) return { success: false, error: 'Vehículo no encontrado.' }

        // REQ-30: fecha no futura
        if (data.fechaIngreso > todayStr())
        return { success: false, error: 'La fecha de ingreso no puede ser futura.' }

        // REQ-31: bloquear si tiene asignación activa
        const tieneAsignacion = assignmentsStore.activas.some(a => a.vehiculoId === data.vehiculoId)
        if (tieneAsignacion)
        return { success: false, error: `El vehículo ${vehicle.placa} tiene una asignación activa. Finalízala antes de ingresar a mantenimiento.` }

        const now = new Date().toISOString()
        const newRecord: MaintenanceRecord = {
        ...data,
        id: generateId(),
        vehiculoPlaca: vehicle.placa,
        vehiculoMarca: vehicle.marca,
        vehiculoModelo: vehicle.modelo,
        fechaSalida: null,
        kilometrajeIngreso: vehicle.kilometraje, // REQ-32: km actual como referencia
        kilometrajeSalida: null,
        comentariosCierre: null,
        proximoMantenimiento: null,
        estado: 'Abierto',
        }
        records.value.unshift(newRecord)

        // REQ-32: cambiar estado vehículo
        const vIdx = vehiclesStore.vehicles.findIndex(v => v.id === data.vehiculoId)
        vehiclesStore.vehicles[vIdx] = {
        ...vehiclesStore.vehicles[vIdx]!,
        estado: 'Mantenimiento',
        actualizadoEn: now,
        }

        auditStore.log({
            usuario: 'Admin',
            accion: 'ABRIR_MANTENIMIENTO',
            entidad: `Vehículo ${vehicle.placa}`,
            detalle: `Mantenimiento ${data.tipo} abierto — ${data.descripcion} | Técnico: ${data.tecnico}`,
        })

        return { success: true }
    }

    function closeMaintenance(id: string, data: MaintenanceCloseData): { success: boolean; error?: string } {
        const idx = records.value.findIndex(r => r.id === id)
        if (idx === -1) return { success: false, error: 'Registro no encontrado.' }

        const record = records.value[idx]!

        // REQ-35: validar fecha próximo mantenimiento ≥ hoy
        if (data.proximoMantenimiento && data.proximoMantenimiento < todayStr())
        return { success: false, error: 'La fecha del próximo mantenimiento debe ser igual o posterior al día de hoy.' }

        const now = new Date().toISOString()
        records.value[idx] = {
        ...record,
        fechaSalida: data.fechaSalida,
        kilometrajeSalida: data.kilometrajeSalida,
        comentariosCierre: data.comentariosCierre ?? null,
        proximoMantenimiento: data.proximoMantenimiento ?? null,
        estado: 'Cerrado',
        }

        // REQ-33: vehículo vuelve a Disponible
        const vIdx = vehiclesStore.vehicles.findIndex(v => v.id === record.vehiculoId)
        vehiclesStore.vehicles[vIdx] = {
        ...vehiclesStore.vehicles[vIdx]!,
        estado: 'Disponible',
        actualizadoEn: now,
        }

        auditStore.log({
            usuario: 'Admin',
            accion: 'CERRAR_MANTENIMIENTO',
            entidad: `Vehículo ${record.vehiculoPlaca}`,
            detalle: `Mantenimiento cerrado. Km salida: ${data.kilometrajeSalida}${data.comentariosCierre ? ` — ${data.comentariosCierre}` : ''}`,
        })
        return { success: true }
    }

    // REQ-34/35: programar próximo sin cambiar estado
    function scheduleNext(id: string, fecha: string): { success: boolean; error?: string } {
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