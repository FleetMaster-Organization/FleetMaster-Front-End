import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AuditLog, AuditAction } from '@/types'

export const useAuditStore = defineStore('audit', () => {
    const logs = ref<AuditLog[]>([])

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