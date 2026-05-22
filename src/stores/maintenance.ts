import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MaintenanceRecord, MaintenanceFormData, MaintenanceCloseData } from '@/types'
import { useVehiclesStore }    from '@/stores/vehicles'
import { useAssignmentsStore } from '@/stores/assignments'
import { useAuditStore }       from '@/stores/audit'
import { api }                 from '@/utils/api'

export const useMaintenanceStore = defineStore('maintenance', () => {
    const auditStore       = useAuditStore()
    const vehiclesStore    = useVehiclesStore()
    const assignmentsStore = useAssignmentsStore()

    const records = ref<MaintenanceRecord[]>([])

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
    const isLoading = ref(false)

    async function loadMaintenances() {
        isLoading.value = true
        try {
            const res = await api.get<any[]>('/maintenances')
            const mapped = res.data.map((item: any) => {
                const vehicle = vehiclesStore.vehicles.find(v => v.id === item.vehicleId || v.placa === item.plate)
                const mType = (item.maintenanceType === 'PREVENTIVO') ? 'Preventivo' : 'Correctivo'
                
                return {
                    id: item.id,
                    vehiculoId: item.vehicleId || '',
                    vehiculoPlaca: item.plate || '',
                    vehiculoMarca: vehicle?.marca || 'Chevrolet',
                    vehiculoModelo: vehicle?.modelo || 'NPR',
                    tipo: mType,
                    descripcion: item.observations || '',
                    fechaIngreso: item.startDate || '',
                    fechaSalida: item.endDate || null,
                    kilometrajeIngreso: item.startKm || 0,
                    kilometrajeSalida: item.endKm || null,
                    costo: Number(item.cost) || 0,
                    comentariosCierre: item.endDate ? (item.observations || '') : null,
                    proximoMantenimiento: item.nextScheduledDate || null,
                    estado: item.endDate ? 'Cerrado' : 'Abierto',
                    tecnico: item.mechanicalWorkshop || 'Taller Autorizado',
                } as MaintenanceRecord
            })
            records.value = mapped
        } catch (error) {
            console.error('Error loading maintenances from backend:', error)
        } finally {
            isLoading.value = false
        }
    }

    async function openMaintenance(
        data: MaintenanceFormData,
    ): Promise<{ success: boolean; error?: string }> {
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

        try {
            const mType = data.tipo.toUpperCase() === 'PREVENTIVO' ? 'PREVENTIVO' : 'CORRECTIVO'

            const res = await api.post('/maintenances', {
                plate: vehicle.placa,
                scheduleId: null,
                maintenanceType: mType,
                mechanicalWorkshop: data.tecnico || 'Taller Autorizado',
                cost: data.costo || 0,
                observations: data.descripcion
            })

            const backendRecord = res.data

            const newRecord: MaintenanceRecord = {
                ...data,
                id:                  backendRecord.id || generateId(),
                vehiculoPlaca:       vehicle.placa,
                vehiculoMarca:       vehicle.marca,
                vehiculoModelo:      vehicle.modelo,
                fechaSalida:         null,
                kilometrajeIngreso:  vehicle.kilometraje,
                kilometrajeSalida:   null,
                comentariosCierre:   null,
                proximoMantenimiento: null,
                estado:              'Abierto',
            }
            records.value.unshift(newRecord)

            await vehiclesStore.loadVehicles()

            auditStore.log({
                accion: 'ABRIR_MANTENIMIENTO',
                usuario: 'Admin',
                entidad: `Vehículo ${vehicle.placa}`,
                detalle: `Mantenimiento ${data.tipo} abierto — ${data.descripcion} | Técnico: ${data.tecnico}`,
            })

            return { success: true }
        } catch (error: any) {
            console.error('Error opening maintenance:', error)
            const msg = error.response?.data?.message || 'Error al conectar con el servidor.'
            return { success: false, error: msg }
        }
    }

    async function closeMaintenance(
        id: string,
        data: MaintenanceCloseData,
    ): Promise<{ success: boolean; error?: string }> {
        const idx = records.value.findIndex(r => r.id === id)
        if (idx === -1) return { success: false, error: 'Registro no encontrado.' }

        const record = records.value[idx]!

        // REQ-35: fecha próximo mantenimiento no puede ser pasada
        if (data.proximoMantenimiento && data.proximoMantenimiento < todayStr())
            return {
                success: false,
                error: 'La fecha del próximo mantenimiento debe ser igual o posterior al día de hoy.',
            }

        try {
            await api.patch(`/maintenances/${id}`, {
                endKm: data.kilometrajeSalida,
                endDate: data.fechaSalida,
                observations: data.comentariosCierre || 'Mantenimiento finalizado exitosamente',
                nextScheduledDate: data.proximoMantenimiento || null,
            })

            records.value[idx] = {
                ...record,
                fechaSalida:          data.fechaSalida,
                kilometrajeSalida:    data.kilometrajeSalida,
                comentariosCierre:    data.comentariosCierre    ?? null,
                proximoMantenimiento: data.proximoMantenimiento ?? null,
                estado:               'Cerrado',
            }

            await vehiclesStore.loadVehicles()

            auditStore.log({
                accion: 'CERRAR_MANTENIMIENTO',
                usuario: 'Admin',
                entidad: `Vehículo ${record.vehiculoPlaca}`,
                detalle: `Mantenimiento cerrado. Km salida: ${data.kilometrajeSalida}${
                    data.comentariosCierre ? ` — ${data.comentariosCierre}` : ''
                }${data.proximoMantenimiento ? ` | Próxima cita: ${data.proximoMantenimiento}` : ''}`,
            })

            return { success: true }
        } catch (error: any) {
            console.error('Error closing maintenance:', error)
            const msg = error.response?.data?.message || 'Error al conectar con el servidor.'
            return { success: false, error: msg }
        }
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
        isLoading,
        loadMaintenances,
        openMaintenance,
        closeMaintenance,
        scheduleNext,
    }
})