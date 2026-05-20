import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Assignment, AssignmentFormData, AssignmentCloseData } from '@/types'
import { useVehiclesStore } from '@/stores/vehicles'
import { useDriversStore }  from '@/stores/drivers'
import { useAuditStore }    from '@/stores/audit'

export const useAssignmentsStore = defineStore('assignments', () => {
    const vehiclesStore = useVehiclesStore()
    const driversStore  = useDriversStore()
    const auditStore    = useAuditStore()

    // ── Estado ────────────────────────────────────────────────
    const assignments = ref<Assignment[]>([
        {
            id: 'a001', vehiculoId: 'v2', vehiculoPlaca: 'XYZ-789',
            vehiculoMarca: 'Toyota', vehiculoModelo: 'Hilux',
            conductorId: 'd1', conductorNombre: 'Carlos Pérez', conductorCedula: '1020304050',
            fechaInicio: '2025-04-28T07:00:00Z', fechaFin: null,
            kilometrajeInicio: 28000, kilometrajeFin: null,
            usuarioResponsable: 'ROLE_ADMINISTRADOR', estado: 'Activa',
        },
        {
            id: 'a002', vehiculoId: 'v_hist_1', vehiculoPlaca: 'DEF-456',
            vehiculoMarca: 'Chevrolet', vehiculoModelo: 'NPR',
            conductorId: 'd_hist_1', conductorNombre: 'Pedro Ramírez', conductorCedula: '79856432101',
            fechaInicio: '2025-04-01T07:00:00Z', fechaFin: '2025-04-01T17:30:00Z',
            kilometrajeInicio: 18200, kilometrajeFin: 18900,
            usuarioResponsable: 'ROLE_ADMINISTRADOR', estado: 'Finalizada',
        },
    ])

    // ── Getters ───────────────────────────────────────────────
    const activas   = computed(() => assignments.value.filter(a => a.estado === 'Activa'))
    const historial = computed(() => assignments.value.filter(a => a.estado === 'Finalizada'))

    const porVehiculo  = (vehiculoId: string)  =>
        computed(() => assignments.value.filter(a => a.vehiculoId === vehiculoId))
    const porConductor = (conductorId: string) =>
        computed(() => assignments.value.filter(a => a.conductorId === conductorId))

    // ── Helpers ───────────────────────────────────────────────
    function generateId(): string {
        return 'a' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7)
    }

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

    function createAssignment(
        data: AssignmentFormData,
    ): { success: boolean; error?: string } {
        const vehicle = vehiclesStore.vehicles.find(v => v.id === data.vehiculoId)
        const driver  = driversStore.drivers.find(d => d.id === data.conductorId)

        // Validar existencia
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

        // REQ-25: crear registro histórico
        const now = new Date().toISOString()
        const newAssignment: Assignment = {
            id:               generateId(),
            vehiculoId:       vehicle.id,
            vehiculoPlaca:    vehicle.placa,
            vehiculoMarca:    vehicle.marca,
            vehiculoModelo:   vehicle.modelo,
            conductorId:      driver.id,
            conductorNombre:  driver.nombre,
            conductorCedula:  driver.cedula,
            fechaInicio:      now,
            fechaFin:         null,
            kilometrajeInicio: vehicle.kilometraje,
            kilometrajeFin:   null,
            usuarioResponsable: data.usuarioResponsable,
            estado: 'Activa',
        }
        assignments.value.unshift(newAssignment)

        // REQ-26: actualizar estados usando los métodos del store
        vehiclesStore.setOperationalStatus(vehicle.id, 'En ruta')
        vehiclesStore.setAssignedDriver(vehicle.id, driver.id, driver.nombre)
        driversStore.setAssignedVehicle(driver.id, vehicle.id, vehicle.placa)

        auditStore.log({
            accion: 'CREAR_ASIGNACION',
            usuario: data.usuarioResponsable,
            entidad: `Vehículo ${vehicle.placa}`,
            detalle: `Asignación creada: ${vehicle.placa} → ${driver.nombre}`,
        })

        return { success: true }
    }

    function closeAssignment(
        id: string,
        data: AssignmentCloseData,
    ): { success: boolean; error?: string } {
        const idx = assignments.value.findIndex(a => a.id === id)
        if (idx === -1) return { success: false, error: 'Asignación no encontrada.' }

        const assignment = assignments.value[idx]!
        const vehicle    = vehiclesStore.vehicles.find(v => v.id === assignment.vehiculoId)

        if (!vehicle) return { success: false, error: 'Vehículo no encontrado.' }

        // REQ-28: km final ≥ km actual
        if (data.kilometrajeFin < vehicle.kilometraje)
            return {
                success: false,
                error: `El kilometraje final (${data.kilometrajeFin} km) no puede ser menor al actual del vehículo (${vehicle.kilometraje} km).`,
            }

        // REQ-25: cerrar registro histórico
        assignments.value[idx] = {
            ...assignment,
            fechaFin:       data.fechaFin,
            kilometrajeFin: data.kilometrajeFin,
            estado:         'Finalizada',
        }

        // REQ-29: liberar vehículo y conductor usando métodos del store
        vehiclesStore.setOperationalStatus(vehicle.id, 'Disponible')
        vehiclesStore.setAssignedDriver(vehicle.id, null, null)
        vehiclesStore.updateKilometraje(vehicle.id, data.kilometrajeFin)
        driversStore.setAssignedVehicle(assignment.conductorId, null, null)

        auditStore.log({
            accion: 'CERRAR_ASIGNACION',
            usuario: assignment.usuarioResponsable,
            entidad: `Vehículo ${assignment.vehiculoPlaca}`,
            detalle: `Asignación finalizada. Km final: ${data.kilometrajeFin}`,
        })

        return { success: true }
    }

    return {
        assignments,
        activas,
        historial,
        porVehiculo,
        porConductor,
        createAssignment,
        closeAssignment,
        validateVehicleDocs,
        validateDriverLicense,
    }
})