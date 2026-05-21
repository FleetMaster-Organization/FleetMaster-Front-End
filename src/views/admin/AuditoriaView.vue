<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuditStore } from '@/stores/audit'
import SearchBar from '@/components/ui/SearchBar.vue'
import DataTable from '@/components/ui/DataTable.vue'
import type { AuditLog, AuditAction } from '@/types'

const auditStore = useAuditStore()

onMounted(() => {
    auditStore.loadLogs()
})

// ── Filtros (REQ-40) ─────────────────────────────────────────
const search   = ref('')
const dateFrom = ref('')
const dateTo   = ref('')

const filteredLogs = computed(() => {
    let result = auditStore.logs
    if (search.value.trim()) {
        const q = search.value.toLowerCase()
        result = result.filter(
        l =>
            l.entidad.toLowerCase().includes(q) ||
            l.usuario.toLowerCase().includes(q) ||
            l.detalle.toLowerCase().includes(q)
        )
    }
    if (dateFrom.value) result = result.filter(l => l.fecha >= dateFrom.value)
    if (dateTo.value)   result = result.filter(l => l.fecha <= dateTo.value + 'T23:59:59Z')
    return result
})

const columns = [
    { key: 'fecha',   label: 'Fecha / Hora', width: '155px' },
    { key: 'usuario', label: 'Usuario', width: '140px' },
    { key: 'accion',  label: 'Acción', width: '195px' },
    { key: 'entidad', label: 'Entidad' },
    { key: 'detalle', label: 'Detalle' },
]

function fmtDateTime(iso: string): string {
    return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(new Date(iso))
}

const accionColors: Partial<Record<AuditAction, string>> = {
    CREAR_VEHICULO:       'bg-blue-50 text-blue-700 border-blue-200',
    EDITAR_VEHICULO:      'bg-slate-100 text-slate-600 border-slate-200',
    INACTIVAR_VEHICULO:   'bg-red-50 text-red-700 border-red-200',
    CREAR_CONDUCTOR:      'bg-blue-50 text-blue-700 border-blue-200',
    EDITAR_CONDUCTOR:     'bg-slate-100 text-slate-600 border-slate-200',
    INACTIVAR_CONDUCTOR:  'bg-red-50 text-red-700 border-red-200',
    ACTIVAR_CONDUCTOR:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    CREAR_ASIGNACION:     'bg-blue-50 text-blue-700 border-blue-200',
    CERRAR_ASIGNACION:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    ABRIR_MANTENIMIENTO:  'bg-amber-50 text-amber-700 border-amber-200',
    CERRAR_MANTENIMIENTO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    GESTIONAR_ALERTA:     'bg-slate-100 text-slate-600 border-slate-200',
    CREAR_USUARIO:        'bg-blue-50 text-blue-700 border-blue-200',
    EDITAR_USUARIO:       'bg-slate-100 text-slate-600 border-slate-200',
    CAMBIAR_ROL:          'bg-amber-50 text-amber-700 border-amber-200',
    ACTIVAR_USUARIO:      'bg-emerald-50 text-emerald-700 border-emerald-200',
    DESACTIVAR_USUARIO:   'bg-red-50 text-red-700 border-red-200',
}

function accionLabel(accion: AuditAction): string {
    const labels: Record<AuditAction, string> = {
        CREAR_VEHICULO: 'Crear vehículo', EDITAR_VEHICULO: 'Editar vehículo',
        INACTIVAR_VEHICULO: 'Inactivar vehículo', CREAR_CONDUCTOR: 'Crear conductor',
        EDITAR_CONDUCTOR: 'Editar conductor', INACTIVAR_CONDUCTOR: 'Inactivar conductor',
        ACTIVAR_CONDUCTOR: 'Activar conductor', CREAR_ASIGNACION: 'Nueva asignación',
        CERRAR_ASIGNACION: 'Cerrar asignación', ABRIR_MANTENIMIENTO: 'Abrir mantenimiento',
        CERRAR_MANTENIMIENTO: 'Cerrar mantenimiento', GESTIONAR_ALERTA: 'Gestionar alerta',
        CREAR_USUARIO: 'Crear usuario', EDITAR_USUARIO: 'Editar usuario',
        CAMBIAR_ROL: 'Cambiar rol', ACTIVAR_USUARIO: 'Activar usuario',
        DESACTIVAR_USUARIO: 'Desactivar usuario',
    }
    return labels[accion] ?? accion
}
</script>

<template>
    <div class="p-6 space-y-6">
        <!-- Header -->
        <div>
        <h1 class="text-2xl font-bold text-slate-800">Auditoría</h1>
        <p class="text-sm text-slate-500 mt-0.5">
            {{ filteredLogs.length }} registros · solo lectura (REQ-40)
        </p>
        </div>

        <!-- Filtros -->
        <div class="flex gap-3 flex-wrap items-end">
        <div class="flex-1 min-w- max-w-sm">
            <SearchBar v-model="search" placeholder="Buscar por entidad, usuario o detalle..." />
        </div>
        <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Desde</label>
            <input v-model="dateFrom" type="date"
            class="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
            />
        </div>
        <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Hasta</label>
            <input v-model="dateTo" type="date"
            class="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
            />
        </div>
        <button
            v-if="search || dateFrom || dateTo"
            class="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            @click="search = ''; dateFrom = ''; dateTo = ''"
        >
            Limpiar filtros
        </button>
        </div>

        <!-- Tabla -->
        <DataTable
        :columns="columns"
        :rows="filteredLogs"
        row-key="id"
        empty-message="No hay registros de auditoría con los filtros aplicados."
        >
        <template #cell-fecha="{ row }">
            <span class="text-xs font-mono text-slate-500">{{ fmtDateTime((row as AuditLog).fecha) }}</span>
        </template>

        <template #cell-usuario="{ row }">
            <span class="text-xs font-semibold text-slate-700">{{ (row as AuditLog).usuario }}</span>
        </template>

        <template #cell-accion="{ row }">
            <span :class="[
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
            accionColors[(row as AuditLog).accion] ?? 'bg-slate-100 text-slate-600 border-slate-200',
            ]">
            {{ accionLabel((row as AuditLog).accion) }}
            </span>
        </template>

        <template #cell-entidad="{ row }">
            <span class="text-xs font-medium text-slate-700">{{ (row as AuditLog).entidad }}</span>
        </template>

        <template #cell-detalle="{ row }">
            <span class="text-xs text-slate-500">{{ (row as AuditLog).detalle }}</span>
        </template>
        </DataTable>
    </div>
</template>