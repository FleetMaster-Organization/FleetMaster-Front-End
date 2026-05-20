import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Assignment, AssignmentFormData, AssignmentCloseData } from '@/types'
import { useVehiclesStore } from '@/stores/vehicles'
import { useDriversStore }  from '@/stores/drivers'
import { useAuditStore }    from '@/stores/audit'
import { useAuthStore }     from '@/stores/auth'
import { api }              from '@/utils/api'

export const useAssignmentsStore = defineStore('assignments', () => {
    const vehiclesStore = useVehiclesStore()
    const driversStore  = useDriversStore()
    const auditStore    = useAuditStore()
    const authStore     = useAuthStore()

    // ── Estado ────────────────────────────────────────────────
    const assignments = ref<Assignment[]>([])
    const isLoading = ref(false)

    // ── Getters ───────────────────────────────────────────────
    const activas   = computed(() => assignments.value.filter(a => a.estado === 'Activa'))
    const historial = computed(() => assignments.value.filter(a => a.estado === 'Finalizada'))

    const porVehiculo  = (vehiculoId: string)  =>
        computed(() => assignments.value.filter(a => a.vehiculoId === vehiculoId))
    const porConductor = (conductorId: string) =>
        computed(() => assignments.value.filter(a => a.conductorId === conductorId))

    // ── Validaciones de documentos ────────────────────────────

    /**
     * Comprueba que el vehículo tenga SOAT y Tecnomecánica vigentes.
     * Usa vehicle.documentos[] (nuevo esquema vehicles_db).
     * Retorna el primer error encontrado, o null si todo está bien.
     */
    function validateVehicleDocs(vehiculoId: string): string | null {
        const vehicle = vehiclesStore.vehicles.find(v => v.id === vehiculoId)
        if (!vehicle) return 'Vehículo no encontrado.'

        const soat  = vehicle.documentos.find(d => d.tipo === 'SOAT')
        const tecno = vehicle.documentos.find(d => d.tipo === 'TECNOMECANICA')

        if (!soat)
            return `El vehículo ${vehicle.placa} no tiene SOAT registrado.`
        if (soat.estadoLegal === 'Vencido')
            return `El SOAT del vehículo ${vehicle.placa} está vencido. Renuévalo antes de asignar.`

        if (!tecno)
            return `El vehículo ${vehicle.placa} no tiene Tecnomecánica registrada.`
        if (tecno.estadoLegal === 'Vencido')
            return `La Tecnomecánica del vehículo ${vehicle.placa} está vencida. Renuévala antes de asignar.`

        return null
    }

    /**
     * Comprueba que el conductor tenga al menos una licencia vigente
     * o por vencer (no todas vencidas).
     * Usa driver.licencias[] (nuevo esquema drivers_db).
     * Retorna el primer error encontrado, o null si todo está bien.
     */
    function validateDriverLicense(conductorId: string): string | null {
        const driver = driversStore.drivers.find(d => d.id === conductorId)
        if (!driver) return 'Conductor no encontrado.'

        if (!driver.licencias.length)
            return `El conductor ${driver.nombre} no tiene licencias registradas.`

        // Bloquear solo si TODAS las licencias están vencidas
        const todasVencidas = driver.licencias.every(l => l.estadoLegal === 'Vencida')
        if (todasVencidas)
            return `Todas las licencias del conductor ${driver.nombre} están vencidas. No puede ser asignado.`

        return null
    }

    // ── Acciones ──────────────────────────────────────────────

    async function loadAssignments() {
        isLoading.value = true
        try {
            const allAssignments: Assignment[] = []

            await Promise.all(vehiclesStore.vehicles.map(async (v) => {
                try {
                    const res = await api.get<any>(`/assignments/vehiculos/${v.id}/historial`)
                    const history = res.data.data || []

                    history.forEach((item: any) => {
                        const isCurrentActive = v.estadoOperativo === 'En ruta' && v.conductorAsignadoNombre === item.conductor

                        allAssignments.push({
                            id: item.id,
                            vehiculoId: v.id,
                            vehiculoPlaca: v.placa,
                            vehiculoMarca: v.marca,
                            vehiculoModelo: v.modelo,
                            conductorId: v.conductorAsignadoId || '',
                            conductorNombre: item.conductor,
                            conductorCedula: '',
                            fechaInicio: item.date,
                            fechaFin: isCurrentActive ? null : item.date,
                            kilometrajeInicio: item.km,
                            kilometrajeFin: isCurrentActive ? null : item.km,
                            usuarioResponsable: 'Admin',
                            estado: isCurrentActive ? 'Activa' : 'Finalizada'
                        })
                    })
                } catch (e) {
                    console.error(`Error loading history for vehicle ${v.placa}:`, e)
                }
            }))

            assignments.value = allAssignments.sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime())
        } catch (error) {
            console.error('Error loading assignments:', error)
        } finally {
            isLoading.value = false
        }
    }

    async function createAssignment(
        data: AssignmentFormData,
    ): Promise<{ success: boolean; error?: string }> {
        const vehicle = vehiclesStore.vehicles.find(v => v.id === data.vehiculoId)
        const driver  = driversStore.drivers.find(d => d.id === data.conductorId)

        if (!vehicle) return { success: false, error: 'Vehículo no encontrado.' }
        if (!driver)  return { success: false, error: 'Conductor no encontrado.' }

        // REQ-22: vehículo debe estar Disponible (estadoOperativo)
        if (vehicle.estadoOperativo !== 'Disponible')
            return {
                success: false,
                error: `El vehículo ${vehicle.placa} no está Disponible (estado actual: ${vehicle.estadoOperativo}).`,
            }

        // REQ-22: vehículo debe estar administrativamente Activo
        if (vehicle.estadoAdministrativo !== 'Activo')
            return {
                success: false,
                error: `El vehículo ${vehicle.placa} no está Activo administrativamente (estado: ${vehicle.estadoAdministrativo}).`,
            }

        // REQ-22: documentos del vehículo vigentes
        const docError = validateVehicleDocs(vehicle.id)
        if (docError) return { success: false, error: docError }

        // REQ-23: conductor debe estar laboralmente ACTIVO
        if (driver.estadoLaboral !== 'ACTIVO')
            return {
                success: false,
                error: `El conductor ${driver.nombre} no está activo laboralmente (estado: ${driver.estadoLaboral}).`,
            }

        // REQ-23: al menos una licencia no vencida
        const licError = validateDriverLicense(driver.id)
        if (licError) return { success: false, error: licError }

        try {
            const userId = authStore.user?.id || '3fa85f64-5717-4562-b3fc-2c963f66afa6'

            await api.post('/assignments/asignaciones', {
                vehicleId: vehicle.id,
                driverId: driver.id,
                userId: userId
            })

            await vehiclesStore.loadVehicles()
            await driversStore.loadDrivers()
            await loadAssignments()

            auditStore.log({
                accion: 'CREAR_ASIGNACION',
                usuario: data.usuarioResponsable,
                entidad: `Vehículo ${vehicle.placa}`,
                detalle: `Asignación creada: ${vehicle.placa} → ${driver.nombre}`,
            })

            return { success: true }
        } catch (error: any) {
            console.error('Error creating assignment:', error)
            const msg = error.response?.data?.message || 'Error al conectar con el servidor.'
            return { success: false, error: msg }
        }
    }

    async function closeAssignment(
        id: string,
        data: AssignmentCloseData,
    ): Promise<{ success: boolean; error?: string }> {
        const assignment = assignments.value.find(a => a.id === id)
        if (!assignment) return { success: false, error: 'Asignación no encontrada.' }

        const vehicle = vehiclesStore.vehicles.find(v => v.id === assignment.vehiculoId)
        if (!vehicle) return { success: false, error: 'Vehículo no encontrado.' }

        if (data.kilometrajeFin < vehicle.kilometraje)
            return {
                success: false,
                error: `El kilometraje final (${data.kilometrajeFin} km) no puede ser menor al actual del vehículo (${vehicle.kilometraje} km).`,
            }

        try {
            const userId = authStore.user?.id || '3fa85f64-5717-4562-b3fc-2c963f66afa6'

            await api.patch(`/assignments/asignaciones/${id}/cerrar`, {
                finalKm: data.kilometrajeFin,
                userId: userId
            })

            await vehiclesStore.loadVehicles()
            await driversStore.loadDrivers()
            await loadAssignments()

            auditStore.log({
                accion: 'CERRAR_ASIGNACION',
                usuario: assignment.usuarioResponsable,
                entidad: `Vehículo ${assignment.vehiculoPlaca}`,
                detalle: `Asignación finalizada. Km final: ${data.kilometrajeFin}`,
            })

            return { success: true }
        } catch (error: any) {
            console.error('Error closing assignment:', error)
            const msg = error.response?.data?.message || 'Error al conectar con el servidor.'
            return { success: false, error: msg }
        }
    }

    return {
        assignments,
        activas,
        historial,
        porVehiculo,
        porConductor,
        isLoading,
        loadAssignments,
        createAssignment,
        closeAssignment,
        validateVehicleDocs,
        validateDriverLicense,
    }
})