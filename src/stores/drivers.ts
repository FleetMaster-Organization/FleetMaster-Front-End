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
    const drivers = ref<Driver[]>([
        // Datos de ejemplo
        {
            id: 'd1',
            nombre: 'Carlos Pérez',
            cedula: '1020304050',
            telefono: '3001234567',
            email: 'cperez@ejemplo.com',
            estadoLaboral: 'ACTIVO',
            subestadoLaboral: 'ACTIVO',
            vehiculoAsignadoId: 'v2',
            vehiculoAsignadoPlaca: 'XYZ-789',
            licencias: [
                {
                    id: 'lic1',
                    conductorId: 'd1',
                    categoria: 'C2',
                    fechaExpedicion: '2020-03-01',
                    fechaVencimiento: '2026-05-10',
                    estadoLegal: calcLicenseStatus('2026-05-10'),
                },
                {
                    id: 'lic2',
                    conductorId: 'd1',
                    categoria: 'B1',
                    fechaExpedicion: '2019-01-15',
                    fechaVencimiento: '2025-01-15',
                    estadoLegal: calcLicenseStatus('2025-01-15'),
                },
            ],
            contactosEmergencia: [
                {
                    id: 'ec1',
                    conductorId: 'd1',
                    nombre: 'María Pérez',
                    telefono: '3109876543',
                    relacion: 'Esposa',
                },
            ],
            creadoEn: '2023-05-10T08:00:00Z',
            actualizadoEn: '2023-05-10T08:00:00Z',
        },
        {
            id: 'd2',
            nombre: 'Luisa Ramírez',
            cedula: '1234567890',
            telefono: '3157654321',
            email: 'lramirez@ejemplo.com',
            estadoLaboral: 'INACTIVO',
            subestadoLaboral: 'VACACIONES',
            vehiculoAsignadoId: null,
            vehiculoAsignadoPlaca: null,
            licencias: [
                {
                    id: 'lic3',
                    conductorId: 'd2',
                    categoria: 'B1',
                    fechaExpedicion: '2021-07-20',
                    fechaVencimiento: '2027-07-20',
                    estadoLegal: calcLicenseStatus('2027-07-20'),
                },
            ],
            contactosEmergencia: [
                {
                    id: 'ec2',
                    conductorId: 'd2',
                    nombre: 'Jorge Ramírez',
                    telefono: '3204567890',
                    relacion: 'Hermano',
                },
            ],
            creadoEn: '2023-09-01T10:00:00Z',
            actualizadoEn: '2023-09-01T10:00:00Z',
        },
    ])

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

    // ── Validaciones ─────────────────────────────────────────

    /** REQ-19: Cédula única (no modificable tras registro) */
    function isCedulaUnique(cedula: string, excludeId?: string): boolean {
        return !drivers.value.some(
            d => d.cedula === cedula && d.id !== excludeId
        )
    }

    /**
     * REQ-21: Verifica si el conductor puede participar en nuevas asignaciones.
     * Debe estar ACTIVO y no tener vehículo asignado.
     */
    function isAvailableForAssignment(driverId: string): boolean {
        const driver = drivers.value.find(d => d.id === driverId)
        return !!driver &&
            driver.estadoLaboral === 'ACTIVO' &&
            !driver.vehiculoAsignadoId
    }

    // ── CRUD ──────────────────────────────────────────────────

    /**
     * REQ-16, REQ-17
     * Crea un conductor con sus licencias y contactos de emergencia.
     * El estadoLegal de cada licencia se calcula automáticamente.
     */
    function createDriver(
        data: DriverFormData,
        usuarioResponsable: string
    ): { ok: boolean; error?: string } {
        // Cédula única
        if (!isCedulaUnique(data.cedula)) {
            return { ok: false, error: 'La cédula ya existe en el sistema.' }
        }
        // Al menos una licencia
        if (!data.licencias.length) {
            return { ok: false, error: 'El conductor debe tener al menos una categoría de licencia.' }
        }
        // Al menos un contacto de emergencia (REQ-16)
        if (!data.contactosEmergencia.length) {
            return { ok: false, error: 'El conductor debe tener al menos un contacto de emergencia.' }
        }
        // Categorías únicas (equivalente al UNIQUE constraint de la BD)
        const categorias = data.licencias.map(l => l.categoria)
        if (new Set(categorias).size !== categorias.length) {
            return { ok: false, error: 'No se puede registrar la misma categoría de licencia dos veces.' }
        }

        const id = generateId()
        const now = isoNow()
        const subestado = data.subestadoLaboral

        const licencias: DriverLicense[] = data.licencias.map(l => ({
            id: generateLicId(),
            conductorId: id,
            categoria: l.categoria,
            fechaExpedicion: l.fechaExpedicion,
            fechaVencimiento: l.fechaVencimiento,
            estadoLegal: calcLicenseStatus(l.fechaVencimiento), // REQ-17
        }))

        const contactosEmergencia: EmergencyContact[] = data.contactosEmergencia.map(c => ({
            id: generateContactId(),
            conductorId: id,
            nombre: c.nombre,
            telefono: c.telefono,
            relacion: c.relacion,
        }))

        const newDriver: Driver = {
            id,
            nombre: data.nombre,
            cedula: data.cedula,
            telefono: data.telefono,
            email: data.email,
            estadoLaboral: statusFromSubstatus(subestado),
            subestadoLaboral: subestado,
            vehiculoAsignadoId: null,
            vehiculoAsignadoPlaca: null,
            licencias,
            contactosEmergencia,
            creadoEn: now,
            actualizadoEn: now,
        }

        drivers.value.push(newDriver)
        audit.log({
            usuario: usuarioResponsable,
            accion: 'CREAR_CONDUCTOR',
            entidad: `Conductor ${data.nombre}`,
            detalle: `Cédula: ${data.cedula}`,
        })
        return { ok: true }
    }

    /**
     * REQ-18, REQ-19
     * Edita datos del conductor y renueva/agrega licencias.
     * Cédula no modificable (REQ-19).
     * Al renovar una licencia existente (mismo id_driver + category), actualiza el registro.
     * El estadoLegal se recalcula automáticamente (REQ-18).
     */
    function updateDriver(
        id: string,
        data: DriverEditFormData,
        usuarioResponsable: string
    ): { ok: boolean; error?: string } {
        const driver = drivers.value.find(d => d.id === id)
        if (!driver) return { ok: false, error: 'Conductor no encontrado.' }

        // Categorías únicas
        const categorias = data.licencias.map(l => l.categoria)
        if (new Set(categorias).size !== categorias.length) {
            return { ok: false, error: 'No se puede registrar la misma categoría de licencia dos veces.' }
        }
        if (!data.contactosEmergencia.length) {
            return { ok: false, error: 'El conductor debe tener al menos un contacto de emergencia.' }
        }

        driver.nombre = data.nombre
        driver.telefono = data.telefono
        driver.email = data.email
        driver.subestadoLaboral = data.subestadoLaboral
        driver.estadoLaboral = statusFromSubstatus(data.subestadoLaboral)
        driver.actualizadoEn = isoNow()

        // Actualizar licencias: UNIQUE (id_driver, category) → upsert por categoría
        data.licencias.forEach(l => {
            const existing = driver.licencias.find(lic => lic.categoria === l.categoria)
            if (existing) {
                // Renovación (REQ-18)
                existing.fechaExpedicion = l.fechaExpedicion
                existing.fechaVencimiento = l.fechaVencimiento
                existing.estadoLegal = calcLicenseStatus(l.fechaVencimiento)
            } else {
                // Nueva categoría
                driver.licencias.push({
                    id: l.id ?? generateLicId(),
                    conductorId: id,
                    categoria: l.categoria,
                    fechaExpedicion: l.fechaExpedicion,
                    fechaVencimiento: l.fechaVencimiento,
                    estadoLegal: calcLicenseStatus(l.fechaVencimiento),
                })
            }
        })

        // Actualizar contactos de emergencia
        driver.contactosEmergencia = data.contactosEmergencia.map(c => ({
            id: c.id ?? generateContactId(),
            conductorId: id,
            nombre: c.nombre,
            telefono: c.telefono,
            relacion: c.relacion,
        }))

        audit.log({
            usuario: usuarioResponsable,
            accion: 'EDITAR_CONDUCTOR',
            entidad: `Conductor ${driver.nombre}`,
            detalle: 'Datos actualizados',
        })
        return { ok: true }
    }

    /**
     * REQ-21: Inactiva un conductor (subestado SUSPENDIDO por defecto).
     * Bloquea su participación en nuevas asignaciones operativas.
     */
    function inactivateDriver(
        id: string,
        subestado: DriverEmploymentSubstatus = 'SUSPENDIDO',
        usuarioResponsable: string
    ): { ok: boolean; error?: string } {
        const driver = drivers.value.find(d => d.id === id)
        if (!driver) return { ok: false, error: 'Conductor no encontrado.' }
        if (driver.vehiculoAsignadoId) {
            return { ok: false, error: 'El conductor tiene una asignación activa. Ciérrela primero.' }
        }

        driver.subestadoLaboral = subestado
        driver.estadoLaboral = statusFromSubstatus(subestado)
        driver.actualizadoEn = isoNow()

        audit.log({
            usuario: usuarioResponsable,
            accion: 'INACTIVAR_CONDUCTOR',
            entidad: `Conductor ${driver.nombre}`,
            detalle: `Subestado: ${subestado}`,
        })
        return { ok: true }
    }

    /** Reactiva un conductor (subestado ACTIVO). */
    function activateDriver(
        id: string,
        usuarioResponsable: string
    ): { ok: boolean; error?: string } {
        const driver = drivers.value.find(d => d.id === id)
        if (!driver) return { ok: false, error: 'Conductor no encontrado.' }

        driver.subestadoLaboral = 'ACTIVO'
        driver.estadoLaboral = 'ACTIVO'
        driver.actualizadoEn = isoNow()

        audit.log({
            usuario: usuarioResponsable,
            accion: 'ACTIVAR_CONDUCTOR',
            entidad: `Conductor ${driver.nombre}`,
            detalle: 'Reactivado',
        })
        return { ok: true }
    }

    /** Vincula o desvincula un vehículo al conductor. */
    function setAssignedVehicle(
        conductorId: string,
        vehiculoId: string | null,
        vehiculoPlaca: string | null
    ) {
        const driver = drivers.value.find(d => d.id === conductorId)
        if (driver) {
            driver.vehiculoAsignadoId = vehiculoId
            driver.vehiculoAsignadoPlaca = vehiculoPlaca
            driver.actualizadoEn = isoNow()
        }
    }

    /** Recalcula estadoLegal de todas las licencias (útil al iniciar la app). */
    function refreshLicenseStatuses() {
        drivers.value.forEach(driver => {
            driver.licencias.forEach(lic => {
                lic.estadoLegal = calcLicenseStatus(lic.fechaVencimiento)
            })
        })
    }

    // ── Búsqueda ─────────────────────────────────────────────
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