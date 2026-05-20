<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import SearchBar from '@/components/ui/SearchBar.vue'
import DataTable from '@/components/ui/DataTable.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'

import { useAlertsStore } from '@/stores/alerts'
import { useAuthStore } from '@/stores/auth'

import type { DataTableCellSlotProps } from '@/types/data-table'

import type {
    AlertSeverity,
    AlertStatus,
    SystemAlert,
} from '@/types'

// ─── Stores ────────────────────────────────────────────────────
const alertsStore = useAlertsStore()
const authStore   = useAuthStore()

// ─── Lifecycle ─────────────────────────────────────────────────
onMounted(() => { alertsStore.cleanStaleManagedIds() })

// ─── Filters ───────────────────────────────────────────────────
const search           = ref('')
const selectedSeverity = ref<'Todos' | AlertSeverity>('Todos')
const selectedStatus   = ref<'Todos' | AlertStatus>('Todos')

// ─── Tabs ──────────────────────────────────────────────────────
const severityTabs = computed(() => [
    { label: 'Todos',      count: alertsStore.alerts.length },
    { label: 'Vencido',    count: alertsStore.criticas.length },
    { label: 'Por vencer', count: alertsStore.advertencias.length },
])

// ─── Table columns ─────────────────────────────────────────────
const columns = [
    { key: 'tipo',             label: 'Tipo' },
    { key: 'entidadNombre',    label: 'Entidad' },
    { key: 'fechaVencimiento', label: 'Vencimiento' },
    { key: 'diasRestantes',    label: 'Días',      align: 'right' as const, width: '110px' },
    { key: 'severidad',        label: 'Severidad', width: '140px' },
    { key: 'estado',           label: 'Estado',    width: '140px' },
    { key: 'acciones',         label: '',          width: '120px', align: 'right' as const },
]

// ─── Filtered alerts ───────────────────────────────────────────
const filteredAlerts = computed<SystemAlert[]>(() => {
    let result = alertsStore.alerts

    if (selectedSeverity.value !== 'Todos') {
        result = result.filter(a => a.severidad === selectedSeverity.value)
    }

    if (selectedStatus.value !== 'Todos') {
        result = result.filter(a => a.estado === selectedStatus.value)
    }

    if (search.value.trim()) {
        const query = search.value.toLowerCase()
        result = result.filter(a =>
            a.tipo.toLowerCase().includes(query) ||
            a.entidadNombre.toLowerCase().includes(query)
        )
    }

    return result
})

// ─── Pagination ────────────────────────────────────────────────
const PAGE_SIZE   = 20
const currentPage = ref(1)

watch([search, selectedSeverity, selectedStatus], () => { currentPage.value = 1 })

const totalPages = computed(() =>
    Math.max(1, Math.ceil(filteredAlerts.value.length / PAGE_SIZE))
)

const paginatedAlerts = computed(() => {
    const start = (currentPage.value - 1) * PAGE_SIZE
    return filteredAlerts.value.slice(start, start + PAGE_SIZE)
})

/** Filas tipadas para DataTable (T extends Record<string, unknown>) */
const tableRows = computed(
    () => paginatedAlerts.value as unknown as Record<string, unknown>[]
)

// ─── Actions ───────────────────────────────────────────────────
function markManaged(alert: SystemAlert) {
    const usuario = authStore.user?.name ?? 'Coordinador'
    alertsStore.markManaged(alert.id, usuario)
}

// ─── Helpers ───────────────────────────────────────────────────
function asAlert(row: DataTableCellSlotProps['row']): SystemAlert {
    return row as unknown as SystemAlert
}

function formatDate(date: string) {
    return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(new Date(date))
}

function getDaysText(days: number) {
    if (days < 0)   return `${Math.abs(days)} vencidos`
    if (days === 0) return 'Hoy'
    return `${days} días`
}
</script>

<template>
    <div class="p-6 space-y-6">

        <!-- Header -->
        <div>
            <h1 class="text-2xl font-bold text-slate-800">
                Alertas
            </h1>
            <p class="text-sm text-slate-500 mt-1">
                Monitoreo de documentos y licencias próximas a vencer.
            </p>
        </div>

        <!-- Severity tabs -->
        <div class="flex flex-wrap gap-2">
            <button
                v-for="tab in severityTabs"
                :key="tab.label"
                type="button"
                class="px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
                :class="
                    selectedSeverity === tab.label
                        ? 'bg-white shadow-sm border border-slate-200 text-slate-800'
                        : 'bg-slate-100 text-slate-500 hover:text-slate-700'
                "
                @click="selectedSeverity = tab.label as 'Todos' | AlertSeverity"
            >
                <span>{{ tab.label }}</span>
                <span class="px-2 py-0.5 rounded-full text-xs bg-slate-200 text-slate-700">
                    {{ tab.count }}
                </span>
            </button>
        </div>

        <!-- Filters -->
        <div class="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">

            <div class="max-w-sm w-full">
                <SearchBar v-model="search" placeholder="Buscar alerta..." />
            </div>

            <div class="flex items-center gap-3">
                <label class="text-xs font-semibold text-slate-600">Estado</label>
                <select
                    v-model="selectedStatus"
                    class="border border-slate-200 rounded-lg px-3 py-2 text-sm
                        focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none"
                >
                    <option value="Todos">Todos</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Gestionada">Gestionada</option>
                </select>
            </div>
        </div>

        <!-- Table -->
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">

            <DataTable
                :columns="columns"
                :rows="tableRows"
                row-key="id"
                empty-message="No se encontraron alertas."
            >

                <template #cell-tipo="{ row }: DataTableCellSlotProps">
                    <div class="space-y-1">
                        <p class="font-semibold text-slate-800">
                            {{ asAlert(row).tipo }}
                        </p>
                        <p class="text-xs text-slate-400 capitalize">
                            {{ asAlert(row).entidadTipo }}
                        </p>
                    </div>
                </template>

                <template #cell-entidadNombre="{ value }: DataTableCellSlotProps">
                    <p class="font-semibold text-slate-800">
                        {{ value as string }}
                    </p>
                </template>

                <template #cell-fechaVencimiento="{ value }: DataTableCellSlotProps">
                    <span class="font-mono text-xs text-slate-700">
                        {{ formatDate(value as string) }}
                    </span>
                </template>

                <template #cell-diasRestantes="{ value }: DataTableCellSlotProps">
                    <div class="text-right">
                        <span
                            class="font-mono text-xs font-semibold"
                            :class="(value as number) < 0
                                ? 'text-red-600'
                                : 'text-amber-600'"
                        >
                            {{ getDaysText(value as number) }}
                        </span>
                    </div>
                </template>

                <template #cell-severidad="{ value }: DataTableCellSlotProps">
                    <StatusBadge :status="value as string" />
                </template>

                <template #cell-estado="{ value }: DataTableCellSlotProps">
                    <StatusBadge :status="value as string" />
                </template>

                <template #cell-acciones="{ row }: DataTableCellSlotProps">
                    <div class="flex justify-end">
                        <button
                            v-if="asAlert(row).estado === 'Pendiente'"
                            type="button"
                            class="px-3 py-1 text-xs rounded-lg border border-slate-200
                                text-slate-600 hover:bg-slate-50 transition"
                            @click="markManaged(asAlert(row))"
                        >
                            Gestionar
                        </button>
                    </div>
                </template>

                <template #pagination>
                    <div class="flex items-center justify-between">
                        <p class="text-xs text-slate-500">
                            Página {{ currentPage }} de {{ totalPages }}
                            ({{ filteredAlerts.length }} registros)
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
