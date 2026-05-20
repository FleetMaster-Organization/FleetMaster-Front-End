<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import SearchBar from '@/components/ui/SearchBar.vue'
import DataTable from '@/components/ui/DataTable.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'

import { useMaintenanceStore } from '@/stores/maintenance'

import type { DataTableCellSlotProps } from '@/types/data-table'
import type { MaintenanceRecord, MaintenanceType } from '@/types'

// ─── Store ─────────────────────────────────────────────────────
const maintenanceStore = useMaintenanceStore()

// ─── Filters ───────────────────────────────────────────────────
const search     = ref('')
const filterTipo = ref<'Todos' | MaintenanceType>('Todos')

const tipoTabs = computed(() => [
    { label: 'Todos',       value: 'Todos' as const,       count: maintenanceStore.cerrados.length },
    { label: 'Preventivo',  value: 'Preventivo' as const,  count: maintenanceStore.cerrados.filter(r => r.tipo === 'Preventivo').length },
    { label: 'Correctivo', value: 'Correctivo' as const, count: maintenanceStore.cerrados.filter(r => r.tipo === 'Correctivo').length },
    { label: 'Revisión',  value: 'Revisión' as const,    count: maintenanceStore.cerrados.filter(r => r.tipo === 'Revisión').length },
])

// ─── Table columns ─────────────────────────────────────────────
const columns = [
    { key: 'vehiculoPlaca',         label: 'Placa',                width: '120px' },
    { key: 'vehiculo',              label: 'Vehículo' },
    { key: 'tipo',                  label: 'Tipo',                 width: '120px' },
    { key: 'tecnico',               label: 'Técnico' },
    { key: 'fechaIngreso',          label: 'Fecha ingreso',        width: '130px' },
    { key: 'fechaSalida',           label: 'Fecha salida',         width: '130px' },
    { key: 'costo',                 label: 'Costo',                align: 'right' as const, width: '130px' },
    { key: 'estado',                label: 'Estado',               width: '120px' },
    { key: 'proximoMantenimiento',  label: 'Próximo mant.',        width: '140px' },
]

// ─── Filtered list ─────────────────────────────────────────────
const filteredItems = computed<MaintenanceRecord[]>(() => {
    let result = maintenanceStore.cerrados

    if (filterTipo.value !== 'Todos') {
        result = result.filter(r => r.tipo === filterTipo.value)
    }

    if (search.value.trim()) {
        const q = search.value.toLowerCase()
        result = result.filter(r =>
            r.vehiculoPlaca.toLowerCase().includes(q) ||
            r.vehiculoMarca.toLowerCase().includes(q) ||
            r.vehiculoModelo.toLowerCase().includes(q) ||
            r.tecnico.toLowerCase().includes(q) ||
            r.tipo.toLowerCase().includes(q) ||
            r.descripcion.toLowerCase().includes(q)
        )
    }

    return result
})

// ─── Pagination ────────────────────────────────────────────────
const PAGE_SIZE   = 20
const currentPage = ref(1)

watch([search, filterTipo], () => { currentPage.value = 1 })

const totalPages = computed(() =>
    Math.max(1, Math.ceil(filteredItems.value.length / PAGE_SIZE))
)

const paginatedItems = computed(() => {
    const start = (currentPage.value - 1) * PAGE_SIZE
    return filteredItems.value.slice(start, start + PAGE_SIZE)
})

/** Filas tipadas para DataTable (T extends Record<string, unknown>) */
const tableRows = computed(
    () => paginatedItems.value as unknown as Record<string, unknown>[]
)

// ─── Stats ─────────────────────────────────────────────────────
const totalCerrados = computed(() => maintenanceStore.cerrados.length)

const totalCosto = computed(() =>
    maintenanceStore.cerrados.reduce((sum, r) => sum + r.costo, 0)
)

const conProximo = computed(() =>
    maintenanceStore.cerrados.filter(r => r.proximoMantenimiento).length
)

// ─── Helpers ───────────────────────────────────────────────────
function asRecord(row: DataTableCellSlotProps['row']): MaintenanceRecord {
    return row as unknown as MaintenanceRecord
}

function formatDate(iso: string | null): string {
    if (!iso) return '—'
    return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(new Date(iso))
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', minimumFractionDigits: 0,
    }).format(value)
}
</script>

<template>
    <div class="p-6 space-y-6">

        <!-- Header -->
        <div>
            <h1 class="text-2xl font-bold text-slate-800">
                Historial de mantenimiento
            </h1>
            <p class="text-sm text-slate-500 mt-1">
                Consulta de registros cerrados — solo lectura
            </p>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="bg-white border border-slate-200 rounded-xl p-5">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Total cerrados
                </p>
                <h3 class="text-3xl font-bold text-slate-800 mt-2">
                    {{ totalCerrados }}
                </h3>
            </div>

            <div class="bg-white border border-slate-200 rounded-xl p-5">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Costo acumulado
                </p>
                <h3 class="text-2xl font-bold text-blue-600 mt-2">
                    {{ formatCurrency(totalCosto) }}
                </h3>
            </div>

            <div class="bg-white border border-slate-200 rounded-xl p-5">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Con próximo programado
                </p>
                <h3 class="text-3xl font-bold text-emerald-600 mt-2">
                    {{ conProximo }}
                </h3>
            </div>
        </div>

        <!-- Tipo tabs -->
        <div class="flex flex-wrap gap-2">
            <button
                v-for="tab in tipoTabs"
                :key="tab.value"
                type="button"
                class="px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
                :class="
                    filterTipo === tab.value
                        ? 'bg-white shadow-sm border border-slate-200 text-slate-800'
                        : 'bg-slate-100 text-slate-500 hover:text-slate-700'
                "
                @click="filterTipo = tab.value"
            >
                <span>{{ tab.label }}</span>
                <span class="px-2 py-0.5 rounded-full text-xs bg-slate-200 text-slate-700">
                    {{ tab.count }}
                </span>
            </button>
        </div>

        <!-- Search -->
        <div class="max-w-sm w-full">
            <SearchBar
                v-model="search"
                placeholder="Buscar por placa, marca, técnico o tipo..."
            />
        </div>

        <!-- Table -->
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <DataTable
                :columns="columns"
                :rows="tableRows"
                row-key="id"
                empty-message="No hay registros cerrados para mostrar."
            >

                <template #cell-vehiculoPlaca="{ value }: DataTableCellSlotProps">
                    <span class="font-mono font-bold text-xs tracking-widest text-slate-800">
                        {{ value as string }}
                    </span>
                </template>

                <template #cell-vehiculo="{ row }: DataTableCellSlotProps">
                    <div class="space-y-1">
                        <p class="font-semibold text-slate-800">
                            {{ asRecord(row).vehiculoMarca }}
                            {{ asRecord(row).vehiculoModelo }}
                        </p>
                    </div>
                </template>

                <template #cell-tipo="{ value }: DataTableCellSlotProps">
                    <span class="text-sm text-slate-700">{{ value as string }}</span>
                </template>

                <template #cell-tecnico="{ value }: DataTableCellSlotProps">
                    <span class="text-sm text-slate-700">{{ value as string }}</span>
                </template>

                <template #cell-fechaIngreso="{ value }: DataTableCellSlotProps">
                    <span class="font-mono text-xs text-slate-600">
                        {{ formatDate(value as string) }}
                    </span>
                </template>

                <template #cell-fechaSalida="{ value }: DataTableCellSlotProps">
                    <span class="font-mono text-xs text-slate-600">
                        {{ formatDate(value as string | null) }}
                    </span>
                </template>

                <template #cell-costo="{ value }: DataTableCellSlotProps">
                    <span class="font-mono text-xs text-slate-700">
                        {{ formatCurrency(value as number) }}
                    </span>
                </template>

                <template #cell-estado="{ value }: DataTableCellSlotProps">
                    <StatusBadge :status="value as string" />
                </template>

                <template #cell-proximoMantenimiento="{ value }: DataTableCellSlotProps">
                    <span class="font-mono text-xs text-slate-600">
                        {{ formatDate(value as string | null) }}
                    </span>
                </template>

                <template #pagination>
                    <div class="flex items-center justify-between">
                        <p class="text-xs text-slate-500">
                            Página {{ currentPage }} de {{ totalPages }}
                            ({{ filteredItems.length }} registros)
                        </p>

                        <div class="flex items-center gap-2">
                            <button
                                type="button"
                                class="px-3 py-1 text-xs border border-slate-200 rounded-lg
                                    hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                :disabled="currentPage === 1"
                                @click="currentPage--"
                            >
                                Anterior
                            </button>

                            <button
                                type="button"
                                class="px-3 py-1 text-xs border border-slate-200 rounded-lg
                                    hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                :disabled="currentPage === totalPages"
                                @click="currentPage++"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                </template>

            </DataTable>
        </div>
    </div>
</template>
