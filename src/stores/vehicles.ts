import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Vehicle, VehicleFormData, VehicleStatus } from '@/types'

export const useVehiclesStore = defineStore('vehicles', () => {
    const vehicles = ref<Vehicle[]>([
        {
        id: 'v001', vin: '1HGBH41JXMN109186', placa: 'ABC-123',
        marca: 'Toyota', modelo: 'Hilux', anio: 2021, tipo: 'Camión',
        estado: 'Asignado', kilometraje: 45200,
        conductorAsignadoId: 'd001', conductorAsignadoNombre: 'Diomedes Díaz',
        fechaVencimientoSoat: '2025-06-15',
        fechaVencimientoTecnomecanica: '2025-09-20',
        creadoEn: '2024-01-10T08:00:00Z', actualizadoEn: '2025-01-15T10:30:00Z',
        },
        {
        id: 'v002', vin: '2T1BURHE0JC043821', placa: 'XYZ-789',
        marca: 'Ford', modelo: 'Transit', anio: 2020, tipo: 'Van',
        estado: 'Mantenimiento', kilometraje: 82400,
        conductorAsignadoId: null, conductorAsignadoNombre: null,
        fechaVencimientoSoat: '2025-08-10',
        fechaVencimientoTecnomecanica: '2025-11-05',
        creadoEn: '2024-02-20T09:00:00Z', actualizadoEn: '2025-02-01T14:00:00Z',
        },
        {
        id: 'v003', vin: '3VWFE21C04M000001', placa: 'DEF-456',
        marca: 'Chevrolet', modelo: 'NPR', anio: 2022, tipo: 'Camión',
        estado: 'Disponible', kilometraje: 18900,
        conductorAsignadoId: null, conductorAsignadoNombre: null,
        fechaVencimientoSoat: '2026-01-20',
        fechaVencimientoTecnomecanica: '2026-03-15',
        creadoEn: '2024-03-05T07:30:00Z', actualizadoEn: '2024-11-10T11:00:00Z',
        },
        {
        id: 'v004', vin: '4T1BF3EK8AU118078', placa: 'GHI-012',
        marca: 'Renault', modelo: 'Master', anio: 2019, tipo: 'Van',
        estado: 'Asignado', kilometraje: 110500,
        conductorAsignadoId: 'd003', conductorAsignadoNombre: 'Carlos López',
        fechaVencimientoSoat: '2025-12-01',
        fechaVencimientoTecnomecanica: '2026-02-28',
        creadoEn: '2024-04-12T08:45:00Z', actualizadoEn: '2025-01-20T09:15:00Z',
        },
        {
        id: 'v005', vin: '5YJSA1DN1DFP14705', placa: 'JKL-345',
        marca: 'Honda', modelo: 'CB500', anio: 2023, tipo: 'Moto',
        estado: 'Disponible', kilometraje: 5200,
        conductorAsignadoId: null, conductorAsignadoNombre: null,
        fechaVencimientoSoat: '2026-05-10',
        fechaVencimientoTecnomecanica: '2026-07-22',
        creadoEn: '2024-05-18T10:00:00Z', actualizadoEn: '2024-12-01T08:00:00Z',
        },
        {
        id: 'v006', vin: '6FPAAAJD4EM227272', placa: 'MNO-678',
        marca: 'Mercedes-Benz', modelo: 'Sprinter', anio: 2021, tipo: 'Van',
        estado: 'Asignado', kilometraje: 63700,
        conductorAsignadoId: 'd004', conductorAsignadoNombre: 'María García',
        fechaVencimientoSoat: '2025-07-30',
        fechaVencimientoTecnomecanica: '2025-10-14',
        creadoEn: '2024-06-01T11:00:00Z', actualizadoEn: '2025-02-10T16:00:00Z',
        },
        {
        id: 'v007', vin: '7MNFPAFW3DM001234', placa: 'PQR-901',
        marca: 'Kenworth', modelo: 'T680', anio: 2018, tipo: 'Camión',
        estado: 'Mantenimiento', kilometraje: 240000,
        conductorAsignadoId: null, conductorAsignadoNombre: null,
        fechaVencimientoSoat: '2025-09-05',
        fechaVencimientoTecnomecanica: '2025-12-20',
        creadoEn: '2024-07-22T07:00:00Z', actualizadoEn: '2025-03-01T12:00:00Z',
        },
        {
        id: 'v008', vin: '8LDTG8285C0000001', placa: 'STU-234',
        marca: 'Yamaha', modelo: 'FZ25', anio: 2022, tipo: 'Moto',
        estado: 'Disponible', kilometraje: 12300,
        conductorAsignadoId: null, conductorAsignadoNombre: null,
        fechaVencimientoSoat: '2026-02-14',
        fechaVencimientoTecnomecanica: '2026-04-30',
        creadoEn: '2024-08-09T09:30:00Z', actualizadoEn: '2024-10-15T14:00:00Z',
        },
        {
        id: 'v009', vin: '9BWZZZ377VT004251', placa: 'VWX-567',
        marca: 'Hyundai', modelo: 'H350', anio: 2020, tipo: 'Bus',
        estado: 'Disponible', kilometraje: 55000,
        conductorAsignadoId: null, conductorAsignadoNombre: null,
        fechaVencimientoSoat: '2025-11-18',
        fechaVencimientoTecnomecanica: '2026-01-09',
        creadoEn: '2024-09-14T08:15:00Z', actualizadoEn: '2024-12-20T10:00:00Z',
        },
        {
        id: 'v010', vin: '1FTFW1ET5DFC10312', placa: 'YZA-890',
        marca: 'Mazda', modelo: 'BT-50', anio: 2023, tipo: 'Camión',
        estado: 'Vendido', kilometraje: 35000,
        conductorAsignadoId: null, conductorAsignadoNombre: null,
        fechaVencimientoSoat: '2024-08-01',
        fechaVencimientoTecnomecanica: '2024-10-01',
        creadoEn: '2023-10-01T07:00:00Z', actualizadoEn: '2024-09-01T12:00:00Z',
        },
    ])

    const isLoading = ref(false)
    const error = ref<string | null>(null)

    // Getters
    const totalVehicles = computed(() => vehicles.value.length)
    const activeVehicles = computed(() =>
        vehicles.value.filter(v => v.estado !== 'Vendido')
    )
    const byStatus = (status: VehicleStatus) =>
        computed(() => vehicles.value.filter(v => v.estado === status))

    const disponibles = computed(() =>
        vehicles.value.filter(v => v.estado === 'Disponible')
    )
    const asignados = computed(() =>
        vehicles.value.filter(v => v.estado === 'Asignado')
    )
    const enMantenimiento = computed(() =>
        vehicles.value.filter(v => v.estado === 'Mantenimiento')
    )

    function generateId(): string {
        return 'v' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
    }

    function vinExists(vin: string, excludeId?: string): boolean {
        return vehicles.value.some(v => v.vin === vin && v.id !== excludeId)
    }

    function placaExists(placa: string, excludeId?: string): boolean {
        return vehicles.value.some(v => v.placa === placa && v.id !== excludeId)
    }

    function canChangeStatus(id: string): boolean {
        const vehicle = vehicles.value.find(v => v.id === id)
        if (!vehicle) return false
        // Bloquear si tiene asignación activa
        if (vehicle.conductorAsignadoId) return false
        return true
    }

    function createVehicle(data: VehicleFormData): { success: boolean; error?: string } {
        if (data.kilometraje < 0) {
        return { success: false, error: 'El kilometraje debe ser un valor positivo.' }
        }
        if (vinExists(data.vin)) {
        return { success: false, error: `El VIN "${data.vin}" ya está registrado.` }
        }
        if (placaExists(data.placa)) {
        return { success: false, error: `La placa "${data.placa}" ya está registrada.` }
        }

        const now = new Date().toISOString()
        const newVehicle: Vehicle = {
        ...data,
        id: generateId(),
        estado: 'Disponible', // REQ-08: siempre Disponible al crear
        conductorAsignadoId: null,
        conductorAsignadoNombre: null,
        creadoEn: now,
        actualizadoEn: now,
        }
        vehicles.value.unshift(newVehicle)
        return { success: true }
    }

    function updateVehicle(id: string, data: Omit<VehicleFormData, 'vin' | 'placa'>): { success: boolean; error?: string } {
        const index = vehicles.value.findIndex(v => v.id === id)
        if (index === -1) return { success: false, error: 'Vehículo no encontrado.' }

        if (data.kilometraje < 0) {
        return { success: false, error: 'El kilometraje debe ser un valor positivo.' }
        }

        const vehicle = vehicles.value[index]!

        // REQ-11: bloquear cambio de estado si tiene asignación o mantenimiento abierto
        if (data.estado !== vehicle.estado && !canChangeStatus(id)) {
        return {
            success: false,
            error: 'No se puede cambiar el estado: el vehículo tiene una asignación activa.',
        }
        }

        vehicles.value[index] = {
        ...vehicle,
        ...data,
        // REQ-10: VIN y placa son inmutables
        id: vehicle.id,
        vin: vehicle.vin,
        placa: vehicle.placa,
        actualizadoEn: new Date().toISOString(),
        }
        return { success: true }
    }

    function sellVehicle(id: string): { success: boolean; error?: string } {
        const index = vehicles.value.findIndex(v => v.id === id)
        if (index === -1) return { success: false, error: 'Vehículo no encontrado.' }
        if (!canChangeStatus(id)) {
        return { success: false, error: 'No se puede inactivar: el vehículo tiene una asignación activa.' }
        }
        vehicles.value[index] = {
        ...vehicles.value[index]!,
        estado: 'Vendido',
        actualizadoEn: new Date().toISOString(),
        }
        return { success: true }
    }

  // REQ-15: NO eliminar físicamente
  // No existe deleteVehicle — solo sellVehicle (inactivación lógica)

    return {
        vehicles,
        isLoading,
        error,
        totalVehicles,
        activeVehicles,
        disponibles,
        asignados,
        enMantenimiento,
        byStatus,
        vinExists,
        placaExists,
        canChangeStatus,
        createVehicle,
        updateVehicle,
        sellVehicle,
    }
})