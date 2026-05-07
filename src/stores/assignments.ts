import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Assignment, AssignmentFormData, AssignmentCloseData } from '@/types'
import { useVehiclesStore } from '@/stores/vehicles'
import { useDriversStore } from '@/stores/drivers'

export const useAssignmentsStore = defineStore('assignments', () => {
    const vehiclesStore = useVehiclesStore()
    const driversStore  = useDriversStore()

    const assignments = ref<Assignment[]>([
    {
        id: 'a001', vehiculoId: 'v001', vehiculoPlaca: 'ABC-123',
        vehiculoMarca: 'Toyota', vehiculoModelo: 'Hilux',
        conductorId: 'd001', conductorNombre: 'Diomedes Díaz', conductorCedula: '10445231890',
        fechaInicio: '2025-04-28T07:00:00Z', fechaFin: null,
        kilometrajeInicio: 44800, kilometrajeFin: null,
        usuarioResponsable: 'Admin', estado: 'Activa',
    },
    {
        id: 'a002', vehiculoId: 'v004', vehiculoPlaca: 'GHI-012',
        vehiculoMarca: 'Renault', vehiculoModelo: 'Master',
        conductorId: 'd003', conductorNombre: 'Carlos López', conductorCedula: '52741896302',
        fechaInicio: '2025-04-27T06:30:00Z', fechaFin: null,
        kilometrajeInicio: 109900, kilometrajeFin: null,
        usuarioResponsable: 'Coordinador1', estado: 'Activa',
    },
    {
        id: 'a003', vehiculoId: 'v006', vehiculoPlaca: 'MNO-678',
        vehiculoMarca: 'Mercedes-Benz', vehiculoModelo: 'Sprinter',
        conductorId: 'd004', conductorNombre: 'María García', conductorCedula: '31569874205',
        fechaInicio: '2025-04-29T08:00:00Z', fechaFin: null,
        kilometrajeInicio: 63200, kilometrajeFin: null,
        usuarioResponsable: 'Admin', estado: 'Activa',
    },
    {
        id: 'a004', vehiculoId: 'v003', vehiculoPlaca: 'DEF-456',
        vehiculoMarca: 'Chevrolet', vehiculoModelo: 'NPR',
        conductorId: 'd002', conductorNombre: 'Pedro Ramírez', conductorCedula: '79856432101',
        fechaInicio: '2025-04-01T07:00:00Z', fechaFin: '2025-04-01T17:30:00Z',
        kilometrajeInicio: 18200, kilometrajeFin: 18900,
        usuarioResponsable: 'Admin', estado: 'Finalizada',
    },
    {
        id: 'a005', vehiculoId: 'v005', vehiculoPlaca: 'JKL-345',
        vehiculoMarca: 'Honda', vehiculoModelo: 'CB500',
        conductorId: 'd005', conductorNombre: 'Luisa Fernández', conductorCedula: '43218765901',
        fechaInicio: '2025-03-15T09:00:00Z', fechaFin: '2025-03-15T16:00:00Z',
        kilometrajeInicio: 4800, kilometrajeFin: 5200,
        usuarioResponsable: 'Coordinador1', estado: 'Finalizada',
    },
    {
        id: 'a006', vehiculoId: 'v009', vehiculoPlaca: 'VWX-567',
        vehiculoMarca: 'Hyundai', vehiculoModelo: 'H350',
        conductorId: 'd007', conductorNombre: 'Andrés Moreno', conductorCedula: '99887766554',
        fechaInicio: '2025-03-20T06:00:00Z', fechaFin: '2025-03-20T18:00:00Z',
        kilometrajeInicio: 54200, kilometrajeFin: 55000,
        usuarioResponsable: 'Admin', estado: 'Finalizada',
    },
    {
        id: 'a007', vehiculoId: 'v008', vehiculoPlaca: 'STU-234',
        vehiculoMarca: 'Yamaha', vehiculoModelo: 'FZ25',
        conductorId: 'd008', conductorNombre: 'Sandra Torres', conductorCedula: '55443322110',
        fechaInicio: '2025-02-10T08:00:00Z', fechaFin: '2025-02-10T14:00:00Z',
        kilometrajeInicio: 11800, kilometrajeFin: 12300,
        usuarioResponsable: 'Coordinador1', estado: 'Finalizada',
    },
    {
        id: 'a008', vehiculoId: 'v003', vehiculoPlaca: 'DEF-456',
        vehiculoMarca: 'Chevrolet', vehiculoModelo: 'NPR',
        conductorId: 'd005', conductorNombre: 'Luisa Fernández', conductorCedula: '43218765901',
        fechaInicio: '2025-01-22T07:30:00Z', fechaFin: '2025-01-22T15:30:00Z',
        kilometrajeInicio: 17500, kilometrajeFin: 18200,
        usuarioResponsable: 'Admin', estado: 'Finalizada',
    },
    ])

  // ── Getters ────────────────────────────────────────────────
    const activas    = computed(() => assignments.value.filter(a => a.estado === 'Activa'))
    const historial  = computed(() => assignments.value.filter(a => a.estado === 'Finalizada'))
    const porVehiculo = (vehiculoId: string) =>
        computed(() => assignments.value.filter(a => a.vehiculoId === vehiculoId))
    const porConductor = (conductorId: string) =>
    computed(() => assignments.value.filter(a => a.conductorId === conductorId))

  // ── Helpers de validación ──────────────────────────────────
    function isDateValid(isoDate: string): boolean {
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)
        return new Date(isoDate) >= hoy
    }

  // ── Acciones ───────────────────────────────────────────────
    function generateId(): string {
        return 'a' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
    }

    function createAssignment(data: AssignmentFormData): { success: boolean; error?: string } {
        const vehicle = vehiclesStore.vehicles.find(v => v.id === data.vehiculoId)
        const driver  = driversStore.drivers.find(d => d.id === data.conductorId)

    // REQ-22: validar vehículo
    if (!vehicle) return { success: false, error: 'Vehículo no encontrado.' }
    if (vehicle.estado !== 'Disponible')
        return { success: false, error: `El vehículo ${vehicle.placa} no está Disponible (estado actual: ${vehicle.estado}).` }
    if (!isDateValid(vehicle.fechaVencimientoSoat))
        return { success: false, error: `El SOAT del vehículo ${vehicle.placa} está vencido. Renuévalo antes de asignar.` }
    if (!isDateValid(vehicle.fechaVencimientoTecnomecanica))
        return { success: false, error: `La Tecnomecánica del vehículo ${vehicle.placa} está vencida. Renuévala antes de asignar.` }

    // REQ-23: validar conductor
    if (!driver) return { success: false, error: 'Conductor no encontrado.' }
    if (driver.estado !== 'Activo')
        return { success: false, error: `El conductor ${driver.nombre} no está Activo (estado actual: ${driver.estado}).` }
    if (driver.estadoLegal !== 'Vigente')
        return { success: false, error: `La licencia del conductor ${driver.nombre} está ${driver.estadoLegal}. No puede ser asignado.` }

    // REQ-25: crear registro histórico
    const now = new Date().toISOString()
    const newAssignment: Assignment = {
        id: generateId(),
        vehiculoId: vehicle.id,
        vehiculoPlaca: vehicle.placa,
        vehiculoMarca: vehicle.marca,
        vehiculoModelo: vehicle.modelo,
        conductorId: driver.id,
        conductorNombre: driver.nombre,
        conductorCedula: driver.cedula,
        fechaInicio: now,
        fechaFin: null,
        kilometrajeInicio: vehicle.kilometraje,
        kilometrajeFin: null,
        usuarioResponsable: data.usuarioResponsable,
        estado: 'Activa',
    }
    assignments.value.unshift(newAssignment)

    // REQ-26: actualizar estados en sus stores
    const vIdx = vehiclesStore.vehicles.findIndex(v => v.id === vehicle.id)
    vehiclesStore.vehicles[vIdx] = {
        ...vehiclesStore.vehicles[vIdx]!,
        estado: 'Asignado',
        conductorAsignadoId: driver.id,
        conductorAsignadoNombre: driver.nombre,
        actualizadoEn: now,
    }
    const dIdx = driversStore.drivers.findIndex(d => d.id === driver.id)
    driversStore.drivers[dIdx] = {
        ...driversStore.drivers[dIdx]!,
        estado: 'Asignado',
        vehiculoAsignadoId: vehicle.id,
        vehiculoAsignadoPlaca: vehicle.placa,
        actualizadoEn: now,
    }

    return { success: true }
    }

function closeAssignment(id: string, data: AssignmentCloseData): { success: boolean; error?: string } {
    const idx = assignments.value.findIndex(a => a.id === id)
    if (idx === -1) return { success: false, error: 'Asignación no encontrada.' }

    const assignment = assignments.value[idx]!
    const vehicle = vehiclesStore.vehicles.find(v => v.id === assignment.vehiculoId)

    // REQ-28: km final ≥ km actual
    if (!vehicle) return { success: false, error: 'Vehículo no encontrado.' }
    if (data.kilometrajeFin < vehicle.kilometraje)
        return {
            success: false,
            error: `El kilometraje final (${data.kilometrajeFin} km) no puede ser menor al actual del vehículo (${vehicle.kilometraje} km).`,
        }

    const now = new Date().toISOString()

    // REQ-25: cerrar registro
    assignments.value[idx] = {
        ...assignment,
        fechaFin: data.fechaFin,
        kilometrajeFin: data.kilometrajeFin,
        estado: 'Finalizada',
    }

    // REQ-29: actualizar km y estados
    
    const vIdx = vehiclesStore.vehicles.findIndex(v => v.id === assignment.vehiculoId)
    vehiclesStore.vehicles[vIdx] = {
        ...vehiclesStore.vehicles[vIdx]!,
        estado: 'Disponible',
        kilometraje: data.kilometrajeFin,
        conductorAsignadoId: null,
        conductorAsignadoNombre: null,
        actualizadoEn: now,
    }
    const dIdx = driversStore.drivers.findIndex(d => d.id === assignment.conductorId)
    driversStore.drivers[dIdx] = {
        ...driversStore.drivers[dIdx]!,
        estado: 'Activo',
        vehiculoAsignadoId: null,
        vehiculoAsignadoPlaca: null,
        actualizadoEn: now,
    }

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
    }
})