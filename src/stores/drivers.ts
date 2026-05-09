import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Driver, DriverFormData, LicenseStatusLegal } from '@/types'
import { useAuditStore } from '@/stores/audit'

function calcularEstadoLegal(fechaVencimiento: string): LicenseStatusLegal {
    const hoy = new Date()
    const vence = new Date(fechaVencimiento)
    const diffMs = vence.getTime() - hoy.getTime()
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (diffDias < 0) return 'Vencida'
    if (diffDias <= 30) return 'Por vencer'
    return 'Vigente'
}

export const useDriversStore = defineStore('drivers', () => {
    const auditStore = useAuditStore()
    const drivers = ref<Driver[]>([
        {
        id: 'd001', nombre: 'Diomedes Díaz', cedula: '10445231890',
        telefono: '3201234567', email: 'diomedes.diaz@logifast.com',
        tipoLicencia: 'C2', fechaVencimientoLicencia: '2025-06-01',
        estadoLegal: calcularEstadoLegal('2025-06-01'),
        estado: 'Asignado', vehiculoAsignadoId: 'v001', vehiculoAsignadoPlaca: 'ABC-123',
        contactoEmergenciaNombre: 'Rosa Díaz', contactoEmergenciaTelefono: '3109876543',
        creadoEn: '2024-01-10T08:00:00Z', actualizadoEn: '2025-01-15T10:30:00Z',
        },
        {
        id: 'd002', nombre: 'Pedro Ramírez', cedula: '79856432101',
        telefono: '3154567890', email: 'pedro.ramirez@logifast.com',
        tipoLicencia: 'B1', fechaVencimientoLicencia: '2026-03-15',
        estadoLegal: calcularEstadoLegal('2026-03-15'),
        estado: 'Activo', vehiculoAsignadoId: null, vehiculoAsignadoPlaca: null,
        contactoEmergenciaNombre: 'Ana Ramírez', contactoEmergenciaTelefono: '3118765432',
        creadoEn: '2024-02-05T09:00:00Z', actualizadoEn: '2024-11-10T11:00:00Z',
        },
        {
        id: 'd003', nombre: 'Carlos López', cedula: '52741896302',
        telefono: '3187654321', email: 'carlos.lopez@logifast.com',
        tipoLicencia: 'C3', fechaVencimientoLicencia: '2024-11-20',
        estadoLegal: calcularEstadoLegal('2024-11-20'),
        estado: 'Asignado', vehiculoAsignadoId: 'v004', vehiculoAsignadoPlaca: 'GHI-012',
        contactoEmergenciaNombre: 'Lucía López', contactoEmergenciaTelefono: '3126543210',
        creadoEn: '2024-03-18T10:00:00Z', actualizadoEn: '2025-01-20T09:15:00Z',
        },
        {
        id: 'd004', nombre: 'María García', cedula: '31569874205',
        telefono: '3219876543', email: 'maria.garcia@logifast.com',
        tipoLicencia: 'B2', fechaVencimientoLicencia: '2025-09-30',
        estadoLegal: calcularEstadoLegal('2025-09-30'),
        estado: 'Asignado', vehiculoAsignadoId: 'v006', vehiculoAsignadoPlaca: 'MNO-678',
        contactoEmergenciaNombre: 'Jorge García', contactoEmergenciaTelefono: '3134567891',
        creadoEn: '2024-04-22T08:45:00Z', actualizadoEn: '2025-02-10T16:00:00Z',
        },
        {
        id: 'd005', nombre: 'Luisa Fernández', cedula: '43218765901',
        telefono: '3165432109', email: 'luisa.fernandez@logifast.com',
        tipoLicencia: 'A2', fechaVencimientoLicencia: '2026-08-14',
        estadoLegal: calcularEstadoLegal('2026-08-14'),
        estado: 'Activo', vehiculoAsignadoId: null, vehiculoAsignadoPlaca: null,
        contactoEmergenciaNombre: 'Roberto Fernández', contactoEmergenciaTelefono: '3141234567',
        creadoEn: '2024-05-30T07:30:00Z', actualizadoEn: '2024-12-01T08:00:00Z',
        },
        {
        id: 'd006', nombre: 'Juan Herrera', cedula: '11223344556',
        telefono: '3201112233', email: 'juan.herrera@logifast.com',
        tipoLicencia: 'C1', fechaVencimientoLicencia: '2025-04-10',
        estadoLegal: calcularEstadoLegal('2025-04-10'),
        estado: 'Inactivo', vehiculoAsignadoId: null, vehiculoAsignadoPlaca: null,
        contactoEmergenciaNombre: 'Elena Herrera', contactoEmergenciaTelefono: '3152233445',
        creadoEn: '2024-06-14T11:00:00Z', actualizadoEn: '2025-01-05T10:00:00Z',
        },
        {
        id: 'd007', nombre: 'Andrés Moreno', cedula: '99887766554',
        telefono: '3179998877', email: 'andres.moreno@logifast.com',
        tipoLicencia: 'B3', fechaVencimientoLicencia: '2027-01-25',
        estadoLegal: calcularEstadoLegal('2027-01-25'),
        estado: 'Activo', vehiculoAsignadoId: null, vehiculoAsignadoPlaca: null,
        contactoEmergenciaNombre: 'Camila Moreno', contactoEmergenciaTelefono: '3163344556',
        creadoEn: '2024-07-08T09:15:00Z', actualizadoEn: '2024-10-20T14:00:00Z',
        },
        {
        id: 'd008', nombre: 'Sandra Torres', cedula: '55443322110',
        telefono: '3145544332', email: 'sandra.torres@logifast.com',
        tipoLicencia: 'A1', fechaVencimientoLicencia: '2025-12-31',
        estadoLegal: calcularEstadoLegal('2025-12-31'),
        estado: 'Activo', vehiculoAsignadoId: null, vehiculoAsignadoPlaca: null,
        contactoEmergenciaNombre: 'Felipe Torres', contactoEmergenciaTelefono: '3175566778',
        creadoEn: '2024-08-19T08:00:00Z', actualizadoEn: '2024-11-30T09:00:00Z',
        },
    ])

    const isLoading = ref(false)
    const error = ref<string | null>(null)

    const activos = computed(() => drivers.value.filter(d => d.estado === 'Activo'))
    const asignados = computed(() => drivers.value.filter(d => d.estado === 'Asignado'))
    const inactivos = computed(() => drivers.value.filter(d => d.estado === 'Inactivo'))
    const conLicenciaVencida = computed(() =>
        drivers.value.filter(d => d.estadoLegal === 'Vencida')
    )
    const conLicenciaPorVencer = computed(() =>
        drivers.value.filter(d => d.estadoLegal === 'Por vencer')
    )

    function generateId(): string {
        return 'd' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
    }

    function cedulaExists(cedula: string, excludeId?: string): boolean {
        return drivers.value.some(d => d.cedula === cedula && d.id !== excludeId)
    }

    function createDriver(data: DriverFormData): { success: boolean; error?: string } {
        if (cedulaExists(data.cedula)) {
        return { success: false, error: `La cédula "${data.cedula}" ya está registrada.` }
        }

        const now = new Date().toISOString()
        const newDriver: Driver = {
        ...data,
        id: generateId(),
        estadoLegal: calcularEstadoLegal(data.fechaVencimientoLicencia),
        vehiculoAsignadoId: null,
        vehiculoAsignadoPlaca: null,
        creadoEn: now,
        actualizadoEn: now,
        }
        drivers.value.unshift(newDriver)

        auditStore.log({
        usuario: 'Admin',
        accion: 'CREAR_CONDUCTOR',
        entidad: `Conductor ${data.nombre}`,
        detalle: `Perfil creado. Licencia ${data.tipoLicencia} — vence ${data.fechaVencimientoLicencia}`,
        })

        return { success: true }
    }

    function updateDriver(
        id: string,
        data: Omit<DriverFormData, 'cedula'>
    ): { success: boolean; error?: string } {
        const index = drivers.value.findIndex(d => d.id === id)
        if (index === -1) return { success: false, error: 'Conductor no encontrado.' }

        const driver = drivers.value[index]!
        drivers.value[index] = {
        ...driver,
        ...data,
        id: driver.id,
        cedula: driver.cedula, // REQ-19: inmutable
        estadoLegal: calcularEstadoLegal(data.fechaVencimientoLicencia), // REQ-17/18
        actualizadoEn: new Date().toISOString(),
        }

        auditStore.log({
        usuario: 'Admin',
        accion: 'EDITAR_CONDUCTOR',
        entidad: `Conductor ${driver.nombre}`,
        detalle: `Información actualizada. Licencia vence: ${data.fechaVencimientoLicencia}`,
        })

        return { success: true }
    }

    function deactivateDriver(id: string): { success: boolean; error?: string } {
        const index = drivers.value.findIndex(d => d.id === id)
        const driver = drivers.value[index]
        if (!driver) return { success: false, error: 'Conductor no encontrado.' }
        if (drivers.value[index]!.estado === 'Asignado') {
        return { success: false, error: 'No se puede inactivar un conductor con asignación activa.' }
        }
        drivers.value[index] = {
        ...drivers.value[index]!,
        estado: 'Inactivo',
        actualizadoEn: new Date().toISOString(),
        }

        auditStore.log({
        usuario: 'Admin',
        accion: 'INACTIVAR_CONDUCTOR',
        entidad: `Conductor ${drivers.value[index].nombre}`,
        detalle: 'Conductor inactivado — bloqueado para nuevas asignaciones',
        })
        return { success: true }
    }

    function activateDriver(id: string): { success: boolean; error?: string } {
        const index = drivers.value.findIndex(d => d.id === id)
        if (index === -1) return { success: false, error: 'Conductor no encontrado.' }
        drivers.value[index] = {
        ...drivers.value[index]!,
        estado: 'Activo',
        actualizadoEn: new Date().toISOString(),
        }

        auditStore.log({
            usuario: 'Admin',
            accion: 'ACTIVAR_CONDUCTOR',
            entidad: `Conductor ${drivers.value[index].nombre}`,
            detalle: 'Conductor activado — disponible para asignaciones',
        })

        return { success: true }
    }

    return {
        drivers,
        isLoading,
        error,
        activos,
        asignados,
        inactivos,
        conLicenciaVencida,
        conLicenciaPorVencer,
        cedulaExists,
        createDriver,
        updateDriver,
        deactivateDriver,
        activateDriver,
    }
})