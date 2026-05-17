import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
    Vehicle,
    VehicleDocument,
    VehicleFormData,
    VehicleEditFormData,
    VehicleOperationalStatus,
    VehicleAdministrativeStatus,
    VehicleDocumentType,
    DocumentLegalStatus,
} from '@/types'
import { useAuditStore } from './audit'

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Calcula el estado legal de un documento comparando su fecha de vencimiento
 * con la fecha actual. No se persiste en BD (decisión de diseño vehicles_db).
 *   - Vencido:    expiration_date < hoy
 *   - Por vencer: expiration_date <= hoy + 30 días
 *   - Vigente:    expiration_date > hoy + 30 días
 */
function calcDocumentLegalStatus(fechaVencimiento: string): DocumentLegalStatus {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiration = new Date(fechaVencimiento)
    expiration.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil(
        (expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (diffDays < 0) return 'Vencido'
    if (diffDays <= 30) return 'Por vencer'
    return 'Vigente'
}

function generateId(): string {
    return `v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function generateDocId(): string {
    return `vd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function isoNow(): string {
    return new Date().toISOString()
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useVehiclesStore = defineStore('vehicles', () => {
    const audit = useAuditStore()

    // ── Estado ───────────────────────────────────────────────
    const vehicles = ref<Vehicle[]>([
        // Datos de ejemplo
        {
            id: 'v1',
            vin: '1HGCM82633A123456',
            placa: 'ABC-123',
            marca: 'Chevrolet',
            modelo: 'NPR',
            anio: 2021,
            tipo: 'Camión',
            estadoOperativo: 'Disponible',
            estadoAdministrativo: 'Activo',
            kilometraje: 45000,
            conductorAsignadoId: null,
            conductorAsignadoNombre: null,
            documentos: [
                {
                    id: 'vd1',
                    vehiculoId: 'v1',
                    tipo: 'SOAT',
                    fechaExpedicion: '2024-01-15',
                    fechaVencimiento: '2025-01-15',
                    estadoLegal: calcDocumentLegalStatus('2025-01-15'),
                },
                {
                    id: 'vd2',
                    vehiculoId: 'v1',
                    tipo: 'TECNOMECANICA',
                    fechaExpedicion: '2023-06-10',
                    fechaVencimiento: '2025-06-10',
                    estadoLegal: calcDocumentLegalStatus('2025-06-10'),
                },
            ],
            creadoEn: '2024-01-15T08:00:00Z',
            actualizadoEn: '2024-01-15T08:00:00Z',
        },
        {
            id: 'v2',
            vin: '2T1BURHE0JC057348',
            placa: 'XYZ-789',
            marca: 'Toyota',
            modelo: 'Hilux',
            anio: 2022,
            tipo: 'Automóvil',
            estadoOperativo: 'En ruta',
            estadoAdministrativo: 'Activo',
            kilometraje: 28000,
            conductorAsignadoId: 'd1',
            conductorAsignadoNombre: 'Carlos Pérez',
            documentos: [
                {
                    id: 'vd3',
                    vehiculoId: 'v2',
                    tipo: 'SOAT',
                    fechaExpedicion: '2024-03-01',
                    fechaVencimiento: '2026-05-20',
                    estadoLegal: calcDocumentLegalStatus('2026-05-20'),
                },
                {
                    id: 'vd4',
                    vehiculoId: 'v2',
                    tipo: 'TECNOMECANICA',
                    fechaExpedicion: '2024-03-01',
                    fechaVencimiento: '2026-03-01',
                    estadoLegal: calcDocumentLegalStatus('2026-03-01'),
                },
            ],
            creadoEn: '2024-03-01T09:00:00Z',
            actualizadoEn: '2024-03-01T09:00:00Z',
        },
    ])

    // ── Computed ─────────────────────────────────────────────

    /** Vehículos activos (no vendidos) */
    const activeVehicles = computed(() =>
        vehicles.value.filter(v => v.estadoAdministrativo !== 'Vendido')
    )

    const totalVehicles = computed(() => vehicles.value.length)
    const availableVehicles = computed(() =>
        vehicles.value.filter(v => v.estadoOperativo === 'Disponible').length
    )
    const inRouteVehicles = computed(() =>
        vehicles.value.filter(v => v.estadoOperativo === 'En ruta').length
    )
    const inMaintenanceVehicles = computed(() =>
        vehicles.value.filter(v => v.estadoOperativo === 'En mantenimiento').length
    )
    const soldVehicles = computed(() =>
        vehicles.value.filter(v => v.estadoAdministrativo === 'Vendido').length
    )

    // ── Validaciones ─────────────────────────────────────────

    /** REQ-06: VIN único */
    function isVinUnique(vin: string, excludeId?: string): boolean {
        return !vehicles.value.some(
            v => v.vin.toUpperCase() === vin.toUpperCase() && v.id !== excludeId
        )
    }

    /** REQ-06: Placa única */
    function isPlacaUnique(placa: string, excludeId?: string): boolean {
        return !vehicles.value.some(
            v => v.placa.toUpperCase() === placa.toUpperCase() && v.id !== excludeId
        )
    }

    // ── CRUD ──────────────────────────────────────────────────

    /**
     * REQ-05, REQ-06, REQ-07, REQ-08
     * Crea un vehículo nuevo con estado operativo "Disponible" y
     * registra sus documentos SOAT y Tecnomecánica.
     */
    function createVehicle(
        data: VehicleFormData,
        usuarioResponsable: string
    ): { ok: boolean; error?: string } {
        // REQ-06
        if (!isVinUnique(data.vin)) {
            return { ok: false, error: 'El VIN ya existe en el sistema.' }
        }
        if (!isPlacaUnique(data.placa)) {
            return { ok: false, error: 'La placa ya existe en el sistema.' }
        }
        // REQ-07
        if (data.kilometraje < 0) {
            return { ok: false, error: 'El kilometraje debe ser un valor positivo.' }
        }

        const id = generateId()
        const now = isoNow()

        const documentos: VehicleDocument[] = [
            {
                id: generateDocId(),
                vehiculoId: id,
                tipo: 'SOAT',
                fechaExpedicion: data.soat.fechaExpedicion,
                fechaVencimiento: data.soat.fechaVencimiento,
                estadoLegal: calcDocumentLegalStatus(data.soat.fechaVencimiento),
            },
            {
                id: generateDocId(),
                vehiculoId: id,
                tipo: 'TECNOMECANICA',
                fechaExpedicion: data.tecnomecanica.fechaExpedicion,
                fechaVencimiento: data.tecnomecanica.fechaVencimiento,
                estadoLegal: calcDocumentLegalStatus(data.tecnomecanica.fechaVencimiento),
            },
        ]

        const newVehicle: Vehicle = {
            id,
            vin: data.vin,
            placa: data.placa,
            marca: data.marca,
            modelo: data.modelo,
            anio: data.anio,
            tipo: data.tipo,
            estadoOperativo: 'Disponible',      // REQ-08
            estadoAdministrativo: 'Activo',
            kilometraje: data.kilometraje,
            conductorAsignadoId: null,
            conductorAsignadoNombre: null,
            documentos,
            creadoEn: now,
            actualizadoEn: now,
        }

        vehicles.value.push(newVehicle)
        audit.log({
            usuario: usuarioResponsable,
            accion: 'CREAR_VEHICULO',
            entidad: `Vehículo ${data.placa}`,
            detalle: `VIN: ${data.vin}`,
        })
        return { ok: true }
    }

    /**
     * REQ-09, REQ-10
     * Edita la información descriptiva y documentos legales del vehículo.
     * Placa y VIN son inmutables.
     */
    function updateVehicle(
        id: string,
        data: VehicleEditFormData,
        usuarioResponsable: string
    ): { ok: boolean; error?: string } {
        const vehicle = vehicles.value.find(v => v.id === id)
        if (!vehicle) return { ok: false, error: 'Vehículo no encontrado.' }

        // REQ-07
        if (data.kilometraje < 0) {
            return { ok: false, error: 'El kilometraje debe ser un valor positivo.' }
        }

        vehicle.marca = data.marca
        vehicle.modelo = data.modelo
        vehicle.anio = data.anio
        vehicle.tipo = data.tipo
        vehicle.kilometraje = data.kilometraje
        vehicle.estadoAdministrativo = data.estadoAdministrativo
        vehicle.actualizadoEn = isoNow()

        // Actualiza documentos
        updateDocument(vehicle, 'SOAT', data.soat)
        updateDocument(vehicle, 'TECNOMECANICA', data.tecnomecanica)

        audit.log({
            usuario: usuarioResponsable,
            accion: 'EDITAR_VEHICULO',
            entidad: `Vehículo ${vehicle.placa}`,
            detalle: 'Datos actualizados',
        })
        return { ok: true }
    }

    /** Actualiza o crea un documento de un tipo específico en el vehículo. */
    function updateDocument(
        vehicle: Vehicle,
        tipo: VehicleDocumentType,
        docData: { fechaExpedicion: string; fechaVencimiento: string }
    ) {
        const existing = vehicle.documentos.find(d => d.tipo === tipo)
        if (existing) {
            existing.fechaExpedicion = docData.fechaExpedicion
            existing.fechaVencimiento = docData.fechaVencimiento
            existing.estadoLegal = calcDocumentLegalStatus(docData.fechaVencimiento)
        } else {
            vehicle.documentos.push({
                id: generateDocId(),
                vehiculoId: vehicle.id,
                tipo,
                fechaExpedicion: docData.fechaExpedicion,
                fechaVencimiento: docData.fechaVencimiento,
                estadoLegal: calcDocumentLegalStatus(docData.fechaVencimiento),
            })
        }
    }

    /**
     * REQ-11: Bloquea cambio de estado si hay asignación o mantenimiento abierto.
     * REQ-14: Permite marcar como "Vendido" (inactivación lógica).
     * REQ-15: No elimina físicamente el registro.
     */
    function changeAdministrativeStatus(
        id: string,
        newStatus: VehicleAdministrativeStatus,
        usuarioResponsable: string,
        hasOpenAssignment: boolean,
        hasOpenMaintenance: boolean
    ): { ok: boolean; error?: string } {
        // REQ-11
        if (hasOpenAssignment) {
            return { ok: false, error: 'El vehículo tiene una asignación activa. Ciérrela primero.' }
        }
        if (hasOpenMaintenance) {
            return { ok: false, error: 'El vehículo tiene un mantenimiento abierto. Ciérrelo primero.' }
        }

        const vehicle = vehicles.value.find(v => v.id === id)
        if (!vehicle) return { ok: false, error: 'Vehículo no encontrado.' }

        vehicle.estadoAdministrativo = newStatus
        vehicle.actualizadoEn = isoNow()

        if (newStatus === 'Vendido') {
            audit.log({
                usuario: usuarioResponsable,
                accion: 'INACTIVAR_VEHICULO',
                entidad: `Vehículo ${vehicle.placa}`,
                detalle: 'Marcado como Vendido',
            })
        } else {
            audit.log({
                usuario: usuarioResponsable,
                accion: 'EDITAR_VEHICULO',
                entidad: `Vehículo ${vehicle.placa}`,
                detalle: `Estado administrativo: ${newStatus}`,
            })
        }
        return { ok: true }
    }

    /** Actualiza el estado operativo (usado por asignaciones y mantenimiento). */
    function setOperationalStatus(id: string, status: VehicleOperationalStatus) {
        const vehicle = vehicles.value.find(v => v.id === id)
        if (vehicle) {
            vehicle.estadoOperativo = status
            vehicle.actualizadoEn = isoNow()
        }
    }

    /** Vincula o desvincula un conductor al vehículo. */
    function setAssignedDriver(
        vehiculoId: string,
        conductorId: string | null,
        conductorNombre: string | null
    ) {
        const vehicle = vehicles.value.find(v => v.id === vehiculoId)
        if (vehicle) {
            vehicle.conductorAsignadoId = conductorId
            vehicle.conductorAsignadoNombre = conductorNombre
            vehicle.actualizadoEn = isoNow()
        }
    }

    /** Actualiza el kilometraje (al cerrar asignación o mantenimiento). */
    function updateKilometraje(vehiculoId: string, km: number) {
        const vehicle = vehicles.value.find(v => v.id === vehiculoId)
        if (vehicle && km > vehicle.kilometraje) {
            vehicle.kilometraje = km
            vehicle.actualizadoEn = isoNow()
        }
    }

    /** Recalcula el estadoLegal de todos los documentos (útil al iniciar la app). */
    function refreshDocumentStatuses() {
        vehicles.value.forEach(vehicle => {
            vehicle.documentos.forEach(doc => {
                doc.estadoLegal = calcDocumentLegalStatus(doc.fechaVencimiento)
            })
        })
    }

    // ── Búsqueda (REQ-13) ────────────────────────────────────
    function searchVehicles(query: string): Vehicle[] {
        const q = query.trim().toUpperCase()
        if (!q) return activeVehicles.value
        return activeVehicles.value.filter(
            v =>
                v.placa.toUpperCase().includes(q) ||
                v.vin.toUpperCase().includes(q)
        )
    }

    return {
        vehicles,
        activeVehicles,
        totalVehicles,
        availableVehicles,
        inRouteVehicles,
        inMaintenanceVehicles,
        soldVehicles,
        isVinUnique,
        isPlacaUnique,
        createVehicle,
        updateVehicle,
        changeAdministrativeStatus,
        setOperationalStatus,
        setAssignedDriver,
        updateKilometraje,
        refreshDocumentStatuses,
        searchVehicles,
    }
})