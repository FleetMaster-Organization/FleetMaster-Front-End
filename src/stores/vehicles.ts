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
    VehicleType,
} from '@/types'
import { useAuditStore } from './audit'
import { api } from '@/utils/api'

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

function mapFrontendTypeToBackendClass(type: VehicleType): string {
    const t = type.toUpperCase()
    if (t.includes('CAMION') || t.includes('CAMIÓ')) return 'CAMION'
    if (t.includes('MOTO')) return 'MOTOCICLETA'
    if (t.includes('AUTOMOVIL') || t.includes('AUTOMÓVIL')) return 'AUTOMOVIL'
    if (t.includes('BUS')) return 'BUS'
    if (t.includes('VAN')) return 'CAMIONETA'
    return 'OTRO'
}

function mapVehicleTypeToBodyType(type: VehicleType): string {
    const t = type.toUpperCase()
    if (t.includes('AUTOMOVIL') || t.includes('AUTOMÓVIL')) return 'SEDAN'
    if (t.includes('VAN')) return 'VAN'
    if (t.includes('CAMION') || t.includes('CAMIÓ')) return 'PICKUP'
    return 'OTRO'
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useVehiclesStore = defineStore('vehicles', () => {
    const audit = useAuditStore()

    // ── Estado ───────────────────────────────────────────────
    const vehicles = ref<Vehicle[]>([])
    const isLoading = ref(false)

    function mapOperationalStatus(backend: string): VehicleOperationalStatus {
        const b = backend.toUpperCase()
        if (b === 'DISPONIBLE') return 'Disponible'
        if (b === 'EN_RUTA') return 'En ruta'
        if (b === 'EN_MANTENIMIENTO') return 'En mantenimiento'
        return 'Disponible'
    }

    function mapAdministrativeStatus(backend: string): VehicleAdministrativeStatus {
        const b = backend.toUpperCase()
        if (b === 'ACTIVO') return 'Activo'
        if (b === 'INACTIVO') return 'Inactivo'
        if (b === 'VENDIDO') return 'Vendido'
        return 'Activo'
    }

    function mapVehicleType(backend: string): VehicleType {
        const b = backend.toUpperCase()
        if (b.includes('CAMION') || b.includes('CAMIÓ')) return 'Camión'
        if (b.includes('VAN')) return 'Van'
        if (b.includes('MOTO')) return 'Moto'
        if (b.includes('BUS')) return 'Bus'
        return 'Automóvil'
    }


    // ── Computed ─────────────────────────────────────────────

    /** Vehículos activos (no vendidos) */
    const activeVehicles = computed(() =>
        vehicles.value.filter(v => v.estadoAdministrativo !== 'Vendido')
    )

    const totalVehicles = computed(() => vehicles.value.length)
    const availableVehicles = computed(() =>
        vehicles.value.filter(v => v.estadoOperativo === 'Disponible' && v.estadoAdministrativo !== 'Vendido').length
    )
    const inRouteVehicles = computed(() =>
        vehicles.value.filter(v => v.estadoOperativo === 'En ruta' && v.estadoAdministrativo !== 'Vendido').length
    )
    const inMaintenanceVehicles = computed(() =>
        vehicles.value.filter(v => v.estadoOperativo === 'En mantenimiento' && v.estadoAdministrativo !== 'Vendido').length
    )
    const soldVehicles = computed(() =>
        vehicles.value.filter(v => v.estadoAdministrativo === 'Vendido').length
    )

    // ── CRUD & API Actions ──────────────────────────────────
    // ── Acciones reales de API ──────────────────────────────
    async function loadVehicles() {
        isLoading.value = true
        try {
            const response = await api.get<any[]>('/vehicles')
            const backendVehicles = response.data

            const loaded = await Promise.all(backendVehicles.map(async (v) => {
                let docs: VehicleDocument[] = []
                try {
                    const docsRes = await api.get<any[]>(`/vehicles/${v.id}/documents`)
                    docs = docsRes.data.map((doc: any) => ({
                        id: doc.id,
                        vehiculoId: doc.vehicleId,
                        tipo: doc.documentType === 'SOAT' ? 'SOAT' : 'TECNOMECANICA',
                        fechaExpedicion: doc.issueDate,
                        fechaVencimiento: doc.expirationDate,
                        estadoLegal: doc.legalStatus as DocumentLegalStatus
                    }))
                } catch (e) {
                    console.error(`Error loading documents for vehicle ${v.plate}:`, e)
                }

                return {
                    id: v.id,
                    vin: v.vin,
                    placa: v.plate,
                    marca: v.brand,
                    modelo: v.line,
                    anio: v.modelYear,
                    tipo: mapVehicleType(v.vehicleClass),
                    estadoOperativo: mapOperationalStatus(v.operationalStatus),
                    estadoAdministrativo: mapAdministrativeStatus(v.administrativeStatus),
                    kilometraje: v.currentKm,
                    conductorAsignadoId: null, // hydrated by assignments or by app setup
                    conductorAsignadoNombre: null,
                    documentos: docs,
                    creadoEn: v.createdAt,
                    actualizadoEn: v.updatedAt
                } as Vehicle
            }))

            vehicles.value = loaded
        } catch (error) {
            console.error('Error loading vehicles from backend:', error)
        } finally {
            isLoading.value = false
        }
    }

    function isVinUnique(vin: string, excludeId?: string): boolean {
        return !vehicles.value.some(
            v => v.vin.toUpperCase() === vin.toUpperCase() && v.id !== excludeId
        )
    }

    function isPlacaUnique(placa: string, excludeId?: string): boolean {
        return !vehicles.value.some(
            v => v.placa.toUpperCase() === placa.toUpperCase() && v.id !== excludeId
        )
    }

    async function createVehicle(
        data: VehicleFormData,
        usuarioResponsable: string
    ): Promise<{ ok: boolean; error?: string }> {
        try {
            // 1. Crear vehículo
            const vehicleRes = await api.post<{ id: string }>('/vehicles', {
                plate: data.placa,
                vin: data.vin,
                brand: data.marca,
                line: data.modelo,
                modelYear: data.anio,
                displacementCc: 1600,
                color: 'Blanco',
                service: 'PARTICULAR',
                vehicleClass: mapFrontendTypeToBackendClass(data.tipo),
                bodyType: mapVehicleTypeToBodyType(data.tipo),
                fuelType: 'GASOLINA',
                engineNumber: `ENG-${Date.now()}`,
                initialKm: data.kilometraje,
                currentKm: data.kilometraje
            })

            const vehicleId = vehicleRes.data.id

            // 2. Agregar SOAT
            await api.post(`/vehicles/${vehicleId}/documents`, {
                documentType: 'SOAT',
                documentNumber: `SOAT${Date.now()}`,
                issuedBy: 'Seguros del Estado',
                issueDate: data.soat.fechaExpedicion,
                expirationDate: data.soat.fechaVencimiento
            })

            // 3. Agregar Tecnomecánica
            await api.post(`/vehicles/${vehicleId}/documents`, {
                documentType: 'TECNO',
                documentNumber: `${Date.now()}`.substring(0, 12),
                issuedBy: 'CDA Autorizado',
                issueDate: data.tecnomecanica.fechaExpedicion,
                expirationDate: data.tecnomecanica.fechaVencimiento
            })

            await loadVehicles()

            audit.log({
                usuario: usuarioResponsable,
                accion: 'CREAR_VEHICULO',
                entidad: `Vehículo ${data.placa}`,
                detalle: `VIN: ${data.vin}`,
            })

            return { ok: true }
        } catch (error: any) {
            console.error('Error creating vehicle:', error)
            const msg = error.response?.data?.message || 'Error al conectar con el servidor.'
            return { ok: false, error: msg }
        }
    }

    async function updateVehicle(
        id: string,
        data: VehicleEditFormData,
        usuarioResponsable: string
    ): Promise<{ ok: boolean; error?: string }> {
        try {
            // 1. Update basic fields (currentKm)
            await api.put(`/vehicles/${id}/update`, {
                displacementCc: 1600,
                color: 'Blanco',
                service: 'PARTICULAR',
                bodyType: mapVehicleTypeToBodyType(data.tipo),
                fuelType: 'GASOLINA',
                engineNumber: `ENG-${Date.now()}`,
                currentKm: data.kilometraje
            })

            const localVehicle = vehicles.value.find(v => v.id === id)
            if (localVehicle) {
                const soatDoc = localVehicle.documentos.find(d => d.tipo === 'SOAT')
                if (soatDoc) {
                    await api.patch(`/vehicles/${id}/document/${soatDoc.id}/renew`, {
                        issuedBy: 'Seguros del Estado',
                        issueDate: data.soat.fechaExpedicion,
                        expirationDate: data.soat.fechaVencimiento
                    })
                }
                const tecDoc = localVehicle.documentos.find(d => d.tipo === 'TECNOMECANICA')
                if (tecDoc) {
                    await api.patch(`/vehicles/${id}/document/${tecDoc.id}/renew`, {
                        issuedBy: 'CDA Autorizado',
                        issueDate: data.tecnomecanica.fechaExpedicion,
                        expirationDate: data.tecnomecanica.fechaVencimiento
                    })
                }
            }

            if (localVehicle && localVehicle.estadoAdministrativo !== data.estadoAdministrativo) {
                await changeAdministrativeStatus(id, data.estadoAdministrativo, usuarioResponsable, false, false)
            }

            await loadVehicles()

            audit.log({
                usuario: usuarioResponsable,
                accion: 'EDITAR_VEHICULO',
                entidad: `Vehículo ID: ${id}`,
                detalle: 'Datos y documentos actualizados',
            })
            return { ok: true }
        } catch (error: any) {
            console.error('Error updating vehicle:', error)
            const msg = error.response?.data?.message || 'Error al conectar con el servidor.'
            return { ok: false, error: msg }
        }
    }

    async function changeAdministrativeStatus(
        id: string,
        newStatus: VehicleAdministrativeStatus,
        usuarioResponsable: string,
        hasOpenAssignment: boolean,
        hasOpenMaintenance: boolean
    ): Promise<{ ok: boolean; error?: string }> {
        if (hasOpenAssignment) {
            return { ok: false, error: 'El vehículo tiene una asignación activa. Ciérrela primero.' }
        }
        if (hasOpenMaintenance) {
            return { ok: false, error: 'El vehículo tiene un mantenimiento abierto. Ciérrelo primero.' }
        }

        try {
            if (newStatus === 'Vendido') {
                await api.patch(`/vehicles/${id}/sell`)
            } else if (newStatus === 'Inactivo') {
                await api.patch(`/vehicles/${id}/suspend`, {
                    suspensionReason: 'Suspendido por el administrador'
                })
            } else if (newStatus === 'Activo') {
                await api.patch(`/vehicles/${id}/activate`)
            }

            await loadVehicles()

            audit.log({
                usuario: usuarioResponsable,
                accion: newStatus === 'Vendido' ? 'INACTIVAR_VEHICULO' : 'EDITAR_VEHICULO',
                entidad: `Vehículo ID: ${id}`,
                detalle: `Estado administrativo cambiado a: ${newStatus}`,
            })

            return { ok: true }
        } catch (error: any) {
            console.error('Error changing administrative status:', error)
            const msg = error.response?.data?.message || 'Error al conectar con el servidor.'
            return { ok: false, error: msg }
        }
    }

    function setOperationalStatus(id: string, status: VehicleOperationalStatus) {
        const vehicle = vehicles.value.find(v => v.id === id)
        if (vehicle) {
            vehicle.estadoOperativo = status
        }
    }

    function setAssignedDriver(
        vehiculoId: string,
        conductorId: string | null,
        conductorNombre: string | null
    ) {
        const vehicle = vehicles.value.find(v => v.id === vehiculoId)
        if (vehicle) {
            vehicle.conductorAsignadoId = conductorId
            vehicle.conductorAsignadoNombre = conductorNombre
        }
    }

    function updateKilometraje(vehiculoId: string, km: number) {
        const vehicle = vehicles.value.find(v => v.id === vehiculoId)
        if (vehicle && km > vehicle.kilometraje) {
            vehicle.kilometraje = km
        }
    }

    function refreshDocumentStatuses() {
        vehicles.value.forEach(vehicle => {
            vehicle.documentos.forEach(doc => {
                doc.estadoLegal = calcDocumentLegalStatus(doc.fechaVencimiento)
            })
        })
    }

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
        isLoading,
        loadVehicles,
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