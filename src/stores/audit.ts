import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AuditLog, AuditAction } from '@/types'

export const useAuditStore = defineStore('audit', () => {
    const logs = ref<AuditLog[]>([
        {
        id: 'log001', fecha: '2025-04-29T08:12:00Z', usuario: 'ROLE_ADMINISTRADOR',
        accion: 'CREAR_ASIGNACION', entidad: 'Vehículo ABC-123',
        detalle: 'Asignación creada: ABC-123 → Diomedes Díaz',
        },
        {
        id: 'log002', fecha: '2025-04-28T07:05:00Z', usuario: 'ROLE_COORDINADOR',
        accion: 'CREAR_ASIGNACION', entidad: 'Vehículo GHI-012',
        detalle: 'Asignación creada: GHI-012 → Carlos López',
        },
        {
        id: 'log003', fecha: '2025-04-25T09:00:00Z', usuario: 'ROLE_ADMINISTRADOR',
        accion: 'ABRIR_MANTENIMIENTO', entidad: 'Vehículo XYZ-789',
        detalle: 'Mantenimiento Correctivo abierto: falla en sistema de frenos',
        },
        {
        id: 'log004', fecha: '2025-04-20T10:30:00Z', usuario: 'ROLE_ADMINISTRADOR',
        accion: 'ABRIR_MANTENIMIENTO', entidad: 'Vehículo PQR-901',
        detalle: 'Mantenimiento Preventivo abierto: cambio de aceite 240k km',
        },
        {
        id: 'log005', fecha: '2025-04-15T14:20:00Z', usuario: 'ROLE_ADMINISTRADOR',
        accion: 'EDITAR_VEHICULO', entidad: 'Vehículo DEF-456',
        detalle: 'Kilometraje actualizado: 18,200 → 18,900 km',
        },
        {
        id: 'log006', fecha: '2025-04-10T11:00:00Z', usuario: 'ROLE_ADMINISTRADOR',
        accion: 'INACTIVAR_CONDUCTOR', entidad: 'Conductor Juan Herrera',
        detalle: 'Conductor inactivado por administrador',
        },
        {
        id: 'log007', fecha: '2025-04-01T07:30:00Z', usuario: 'ROLE_ADMINISTRADOR',
        accion: 'CERRAR_ASIGNACION', entidad: 'Vehículo DEF-456',
        detalle: 'Asignación finalizada: Pedro Ramírez — km final 18,900',
        },
        {
        id: 'log008', fecha: '2025-03-20T18:05:00Z', usuario: 'ROLE_COORDINADOR',
        accion: 'CERRAR_ASIGNACION', entidad: 'Vehículo VWX-567',
        detalle: 'Asignación finalizada: Andrés Moreno — km final 55,000',
        },
        {
        id: 'log009', fecha: '2025-03-10T08:00:00Z', usuario: 'ROLE_ADMINISTRADOR',
        accion: 'CERRAR_MANTENIMIENTO', entidad: 'Vehículo ABC-123',
        detalle: 'Mantenimiento Revisión cerrado. Vehículo liberado.',
        },
        {
        id: 'log010', fecha: '2025-02-14T13:00:00Z', usuario: 'ROLE_ADMINISTRADOR',
        accion: 'CREAR_CONDUCTOR', entidad: 'Conductor Sandra Torres',
        detalle: 'Perfil de conductor creado. Licencia A1 vigente hasta 2025-12-31.',
        },
    ])

    // REQ-40: getters y filtros de consulta
    const byVehiculo  = (placa: string) =>
        computed(() => logs.value.filter(l => l.entidad.toLowerCase().includes(placa.toLowerCase())))
    const byConductor = (nombre: string) =>
        computed(() => logs.value.filter(l => l.entidad.toLowerCase().includes(nombre.toLowerCase())))
    const byFecha     = (desde: string, hasta: string) =>
        computed(() => logs.value.filter(l => l.fecha >= desde && l.fecha <= hasta + 'T23:59:59Z'))

    // REQ-41: agregar log desde cualquier store
    function log(entry: Omit<AuditLog, 'id' | 'fecha'>) {
        logs.value.unshift({
        ...entry,
        id: 'log' + Date.now().toString(36),
        fecha: new Date().toISOString(),
        })
    }

    return { logs, byVehiculo, byConductor, byFecha, log }
})