import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
    Driver,
    DriverLicense,
    EmergencyContact,
    DriverFormData,
    DriverEditFormData,
    DriverEmploymentStatus,
    DriverEmploymentSubstatus,
    LicenseCategory,
    LicenseStatusLegal,
} from '@/types'
import { useAuditStore } from './audit'
import { api } from '@/utils/api'

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Calcula el estado legal de una licencia comparando su fecha de vencimiento
 * con la fecha actual. No se persiste en BD (mismo criterio que vehicle_documents).
 *   - Vencida:    expiration_date < hoy
 *   - Por vencer: expiration_date <= hoy + 30 días  (REQ-20: indicador amarillo)
 *   - Vigente:    expiration_date > hoy + 30 días
 */
function calcLicenseStatus(fechaVencimiento: string): LicenseStatusLegal {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiration = new Date(fechaVencimiento)
    expiration.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil(
        (expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (diffDays < 0) return 'Vencida'       // REQ-20: indicador rojo
    if (diffDays <= 30) return 'Por vencer'  // REQ-20: indicador amarillo
    return 'Vigente'
}

/**
 * Derivar el estadoLaboral (status padre) desde el subestado.
 * La tabla drivers solo guarda FK a employment_substatus;
 * el status padre se obtiene por JOIN en la app.
 */
function statusFromSubstatus(sub: DriverEmploymentSubstatus): DriverEmploymentStatus {
    if (sub === 'ACTIVO') return 'ACTIVO'
    if (['SUSPENDIDO', 'VACACIONES', 'INCAPACIDAD'].includes(sub)) return 'INACTIVO'
    return 'RETIRADO' // DESPEDIDO | RENUNCIA
}

function generateId(): string {
    return `d_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function generateLicId(): string {
    return `lic_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function generateContactId(): string {
    return `ec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function isoNow(): string {
    return new Date().toISOString()
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useDriversStore = defineStore('drivers', () => {
    const audit = useAuditStore()

    // ── Estado ───────────────────────────────────────────────
    const drivers = ref<Driver[]>([])
    const isLoading = ref(false)

    async function getSubstatusUuid(name: string): Promise<string> {
        try {
            const res = await api.get<any[]>('/drivers/substatuses')
            const matching = res.data.find(s => s.substatusName.toUpperCase() === name.toUpperCase())
            return matching ? matching.idSubstatus : ''
        } catch (e) {
            console.error('Error fetching substatuses:', e)
            return ''
        }
    }


    // ── Computed ─────────────────────────────────────────────

    /** Conductores activos (estadoLaboral === ACTIVO) */
    const activeDrivers = computed(() =>
        drivers.value.filter(d => d.estadoLaboral === 'ACTIVO')
    )

    /** Conductores disponibles para nueva asignación (ACTIVO y sin vehículo) */
    const availableDrivers = computed(() =>
        drivers.value.filter(
            d => d.estadoLaboral === 'ACTIVO' && !d.vehiculoAsignadoId
        )
    )

    const totalDrivers = computed(() => drivers.value.length)
    const activeDriversCount = computed(() => activeDrivers.value.length)

    /** Conductores con al menos una licencia vencida o por vencer (REQ-20) */
    const driversWithLicenseWarning = computed(() =>
        drivers.value.filter(d =>
            d.licencias.some(
                l => l.estadoLegal === 'Vencida' || l.estadoLegal === 'Por vencer'
            )
        )
    )

    // ── Acciones reales de API ──────────────────────────────
    async function loadDrivers() {
        isLoading.value = true
        try {
            const response = await api.get<any[]>('/drivers')
            const summaries = response.data

            const loaded = await Promise.all(summaries.map(async (d: any) => {
                let fullDetails: any = null
                try {
                    const fullRes = await api.get<any>(`/drivers/${d.idDriver}`)
                    fullDetails = fullRes.data
                } catch (e) {
                    console.error(`Error loading details for driver ${d.fullName}:`, e)
                }

                const licencias: DriverLicense[] = (fullDetails?.licenses || d.licenses || []).map((l: any) => ({
                    id: l.idLicense || l.id,
                    conductorId: d.idDriver,
                    categoria: l.category || l.categoria,
                    fechaExpedicion: l.issueDate || l.fechaExpedicion,
                    fechaVencimiento: l.expirationDate || l.fechaVencimiento,
                    estadoLegal: (l.legalStatus || l.estadoLegal || 'Vigente') as LicenseStatusLegal
                }))

                const contactosEmergencia: EmergencyContact[] = (fullDetails?.emergencyContacts || []).map((c: any) => ({
                    id: c.idEmergencyContact || c.id,
                    conductorId: d.idDriver,
                    nombre: c.contactName || (c.firstName + ' ' + c.lastName),
                    telefono: c.contactPhone || c.phone || c.telefono,
                    relacion: c.relationship || c.relacion || 'Contacto'
                }))

                return {
                    id: d.idDriver,
                    nombre: d.fullName,
                    cedula: d.idCard,
                    telefono: fullDetails?.phone || '',
                    email: fullDetails?.email || '',
                    estadoLaboral: d.employmentStatus as DriverEmploymentStatus,
                    subestadoLaboral: d.employmentSubstatus as DriverEmploymentSubstatus,
                    vehiculoAsignadoId: null,
                    vehiculoAsignadoPlaca: null,
                    licencias,
                    contactosEmergencia,
                    creadoEn: fullDetails?.hiringDate || '',
                    actualizadoEn: ''
                } as Driver
            }))

            drivers.value = loaded
        } catch (error) {
            console.error('Error loading drivers from backend:', error)
        } finally {
            isLoading.value = false
        }
    }

    function isCedulaUnique(cedula: string, excludeId?: string): boolean {
        return !drivers.value.some(
            d => d.cedula === cedula && d.id !== excludeId
        )
    }

    function isAvailableForAssignment(driverId: string): boolean {
        const driver = drivers.value.find(d => d.id === driverId)
        return !!driver &&
            driver.estadoLaboral === 'ACTIVO' &&
            !driver.vehiculoAsignadoId
    }

    async function createDriver(
        data: DriverFormData,
        usuarioResponsable: string
    ): Promise<{ ok: boolean; error?: string }> {
        try {
            if (!data.licencias.length) {
                return { ok: false, error: 'El conductor debe tener al menos una categoría de licencia.' }
            }
            if (!data.contactosEmergencia.length) {
                return { ok: false, error: 'El conductor debe tener al menos un contacto de emergencia.' }
            }

            const emergencyContact = data.contactosEmergencia[0]
            if (!emergencyContact) {
                return { ok: false, error: 'El conductor debe tener al menos un contacto de emergencia.' }
            }

            const names = data.nombre.trim().split(' ')
            const firstName = names[0] || 'Conductor'
            const lastName = names.slice(1).join(' ') || 'Sin Apellido'

            await api.post('/drivers', {
                idCard: data.cedula,
                firstName,
                lastName,
                birthDate: '1995-01-01',
                phone: data.telefono,
                hiringDate: new Date().toISOString().split('T')[0],
                licenses: data.licencias.map(l => ({
                    category: l.categoria,
                    issueDate: l.fechaExpedicion,
                    expirationDate: l.fechaVencimiento
                })),
                emergencyContact: {
                    contactName: emergencyContact.nombre,
                    contactPhone: emergencyContact.telefono,
                    relationship: emergencyContact.relacion
                }
            })

            await loadDrivers()

            audit.log({
                usuario: usuarioResponsable,
                accion: 'CREAR_CONDUCTOR',
                entidad: `Conductor ${data.nombre}`,
                detalle: `Cédula: ${data.cedula}`,
            })

            return { ok: true }
        } catch (error: any) {
            console.error('Error creating driver:', error)
            const msg = error.response?.data?.message || 'Error al conectar con el servidor.'
            return { ok: false, error: msg }
        }
    }

    async function updateDriver(
        id: string,
        data: DriverEditFormData,
        usuarioResponsable: string
    ): Promise<{ ok: boolean; error?: string }> {
        try {
            const localDriver = drivers.value.find(d => d.id === id)
            if (!localDriver) return { ok: false, error: 'Conductor no encontrado.' }

            const names = data.nombre.trim().split(' ')
            const firstName = names[0] || 'Conductor'
            const lastName = names.slice(1).join(' ') || 'Sin Apellido'

            await api.patch(`/drivers/${id}/personal`, {
                firstName,
                lastName,
                phone: data.telefono
            })

            if (localDriver.subestadoLaboral !== data.subestadoLaboral) {
                const substatusId = await getSubstatusUuid(data.subestadoLaboral)
                if (substatusId) {
                    await api.patch(`/drivers/${id}/status`, {
                        idSubstatus: substatusId
                    })
                }
            }

            for (const l of data.licencias) {
                const existingLicense = localDriver.licencias.find(lic => lic.categoria === l.categoria)
                if (existingLicense) {
                    await api.patch(`/drivers/${id}/licenses/${existingLicense.id}/expiration`, {
                        expirationDate: l.fechaVencimiento
                    })
                } else {
                    await api.post(`/drivers/${id}/licenses`, {
                        category: l.categoria,
                        issueDate: l.fechaExpedicion,
                        expirationDate: l.fechaVencimiento
                    })
                }
            }

            const localContact = localDriver.contactosEmergencia[0]
            const updatedContact = data.contactosEmergencia[0]
            if (localContact && updatedContact) {
                await api.patch(`/drivers/${id}/emergency-contact/${localContact.id}`, {
                    contactName: updatedContact.nombre,
                    contactPhone: updatedContact.telefono,
                    relationship: updatedContact.relacion
                })
            }

            await loadDrivers()

            audit.log({
                usuario: usuarioResponsable,
                accion: 'EDITAR_CONDUCTOR',
                entidad: `Conductor ${data.nombre}`,
                detalle: 'Datos y licencias actualizados',
            })

            return { ok: true }
        } catch (error: any) {
            console.error('Error updating driver:', error)
            const msg = error.response?.data?.message || 'Error al conectar con el servidor.'
            return { ok: false, error: msg }
        }
    }

    async function inactivateDriver(
        id: string,
        subestado: DriverEmploymentSubstatus = 'SUSPENDIDO',
        usuarioResponsable: string
    ): Promise<{ ok: boolean; error?: string }> {
        try {
            const substatusId = await getSubstatusUuid(subestado)
            if (!substatusId) {
                return { ok: false, error: 'Subestado no configurado en el sistema.' }
            }

            await api.patch(`/drivers/${id}/status`, {
                idSubstatus: substatusId
            })

            await loadDrivers()

            audit.log({
                usuario: usuarioResponsable,
                accion: 'INACTIVAR_CONDUCTOR',
                entidad: `Conductor ID: ${id}`,
                detalle: `Subestado: ${subestado}`,
            })

            return { ok: true }
        } catch (error: any) {
            console.error('Error inactivating driver:', error)
            const msg = error.response?.data?.message || 'Error al conectar con el servidor.'
            return { ok: false, error: msg }
        }
    }

    async function activateDriver(
        id: string,
        usuarioResponsable: string
    ): Promise<{ ok: boolean; error?: string }> {
        try {
            const substatusId = await getSubstatusUuid('ACTIVO')
            if (!substatusId) {
                return { ok: false, error: 'Subestado ACTIVO no configurado.' }
            }

            await api.patch(`/drivers/${id}/status`, {
                idSubstatus: substatusId
            })

            await loadDrivers()

            audit.log({
                usuario: usuarioResponsable,
                accion: 'ACTIVAR_CONDUCTOR',
                entidad: `Conductor ID: ${id}`,
                detalle: 'Reactivado exitosamente',
            })

            return { ok: true }
        } catch (error: any) {
            console.error('Error activating driver:', error)
            const msg = error.response?.data?.message || 'Error al conectar con el servidor.'
            return { ok: false, error: msg }
        }
    }

    function setAssignedVehicle(
        conductorId: string,
        vehiculoId: string | null,
        vehiculoPlaca: string | null
    ) {
        const driver = drivers.value.find(d => d.id === conductorId)
        if (driver) {
            driver.vehiculoAsignadoId = vehiculoId
            driver.vehiculoAsignadoPlaca = vehiculoPlaca
        }
    }

    function refreshLicenseStatuses() {
        drivers.value.forEach(driver => {
            driver.licencias.forEach(lic => {
                lic.estadoLegal = calcLicenseStatus(lic.fechaVencimiento)
            })
        })
    }

    function searchDrivers(query: string): Driver[] {
        const q = query.trim().toLowerCase()
        if (!q) return drivers.value
        return drivers.value.filter(
            d =>
                d.nombre.toLowerCase().includes(q) ||
                d.cedula.includes(q)
        )
    }

    return {
        drivers,
        activeDrivers,
        availableDrivers,
        totalDrivers,
        activeDriversCount,
        driversWithLicenseWarning,
        isLoading,
        loadDrivers,
        isCedulaUnique,
        isAvailableForAssignment,
        createDriver,
        updateDriver,
        inactivateDriver,
        activateDriver,
        setAssignedVehicle,
        refreshLicenseStatuses,
        searchDrivers,
    }
})