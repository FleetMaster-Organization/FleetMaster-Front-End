<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useVehiclesStore } from '@/stores/vehicles'

import SearchBar from '@/components/ui/SearchBar.vue'
import DataTable from '@/components/ui/DataTable.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'

import type { Vehicle, VehicleOperationalStatus } from '@/types'

// ─── Store ───────────────────────────────────────────────────
const vehiclesStore = useVehiclesStore()

// ─── Search & filters ────────────────────────────────────────
const search = ref('')
const filterStatus = ref<'Todos' | VehicleOperationalStatus>('Todos')

// ─── Pagination (REQ-12) ──────────────────────────────────────
const PAGE_SIZE = 20
const currentPage = ref(1)

watch([search, filterStatus], () => {
    currentPage.value = 1
})

// ─── Table columns ───────────────────────────────────────────
const columns = [
    { key: 'placa',          label: 'Placa',              width: '120px' },
    { key: 'vehiculo',       label: 'Vehículo' },
    { key: 'tipo',           label: 'Tipo',               width: '110px' },
    { key: 'estadoOperativo',label: 'Estado operativo',   width: '160px' },
    { key: 'conductor',      label: 'Conductor asignado' },
    { key: 'kilometraje',    label: 'Kilometraje',        align: 'right' as const },
    { key: 'soat',           label: 'SOAT',               width: '150px' },
    { key: 'tecnomecanica',  label: 'Tecno mecánica',     width: '160px' },
]

// ─── Stats — reusar computed del store (evita redefinir lógica) ──
const totalVehicles      = computed(() => vehiclesStore.totalVehicles)
const availableVehicles  = computed(() => vehiclesStore.availableVehicles)
const inRouteVehicles    = computed(() => vehiclesStore.inRouteVehicles)
const maintenanceVehicles = computed(() => vehiclesStore.inMaintenanceVehicles)

// ─── Filtering ───────────────────────────────────────────────
// Excluye 'Vendido' (coordinador solo ve vehículos activos/inactivos operativamente)
const filteredVehicles = computed(() => {
    let result = vehiclesStore.vehicles.filter(
        v => v.estadoAdministrativo !== 'Vendido'
    )

    if (filterStatus.value !== 'Todos') {
        result = result.filter(v => v.estadoOperativo === filterStatus.value)
    }

    if (search.value.trim()) {
        const q = search.value.toLowerCase()
        result = result.filter(v =>
            v.placa.toLowerCase().includes(q) ||
            v.vin.toLowerCase().includes(q)   ||
            v.marca.toLowerCase().includes(q) ||
            v.modelo.toLowerCase().includes(q)
        )
    }

    return result
})

// ─── Pagination ───────────────────────────────────────────────
const paginatedVehicles = computed(() => {
    const start = (currentPage.value - 1) * PAGE_SIZE
    return filteredVehicles.value.slice(start, start + PAGE_SIZE)
})

const totalPages = computed(() =>
    Math.max(1, Math.ceil(filteredVehicles.value.length / PAGE_SIZE))
)

// ─── Helpers ──────────────────────────────────────────────────
function formatKm(value: number): string {
    return `${new Intl.NumberFormat('es-CO').format(value)} km`
}

function formatDate(iso: string): string {
    return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(new Date(iso))
}

// Devuelve el estadoLegal de un documento específico del vehículo.
// Si el documento no existe (dato incompleto), lo trata como 'Vencido'
// para no ocultar un posible problema.
function getDocEstado(vehicle: Vehicle, tipo: 'SOAT' | 'TECNOMECANICA') {
    return vehicle.documentos.find(d => d.tipo === tipo) ?? null
}

// Contadores de tabs
const countTodos        = computed(() =>
    vehiclesStore.vehicles.filter(v => v.estadoAdministrativo !== 'Vendido').length
)
const countDisponible   = computed(() => vehiclesStore.availableVehicles)
const countEnRuta       = computed(() => vehiclesStore.inRouteVehicles)
const countMantenimiento = computed(() => vehiclesStore.inMaintenanceVehicles)
</script>

<template>
    <div class="p-6 space-y-6">

        <!-- ─── Header ─────────────────────────────────────── -->
        <div>
            <h1 class="text-2xl font-bold text-slate-800">Vehículos</h1>
            <p class="text-sm text-slate-500 mt-1">
                Consulta y monitoreo de la flota vehicular
            </p>
        </div>

        <!-- ─── Stats cards ────────────────────────────────── -->
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

            <div class="bg-white border border-slate-200 rounded-xl p-5">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Total vehículos
                </p>
                <h2 class="text-3xl font-bold text-slate-800 mt-2">
                    {{ totalVehicles }}
                </h2>
            </div>

            <div class="bg-white border border-slate-200 rounded-xl p-5">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Disponibles
                </p>
                <h2 class="text-3xl font-bold text-emerald-600 mt-2">
                    {{ availableVehicles }}
                </h2>
            </div>

            <div class="bg-white border border-slate-200 rounded-xl p-5">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    En ruta
                </p>
                <h2 class="text-3xl font-bold text-blue-600 mt-2">
                    {{ inRouteVehicles }}
                </h2>
            </div>

            <div class="bg-white border border-slate-200 rounded-xl p-5">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    En mantenimiento
                </p>
                <h2 class="text-3xl font-bold text-amber-600 mt-2">
                    {{ maintenanceVehicles }}
                </h2>
            </div>
        </div>

        <!-- ─── Filters ────────────────────────────────────── -->
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

            <!-- Tabs de estado -->
            <div class="bg-slate-100 p-1 rounded-xl flex flex-wrap gap-1">

                <button
                    v-for="tab in ([
                        { value: 'Todos',           label: 'Todos',          count: countTodos },
                        { value: 'Disponible',      label: 'Disponibles',    count: countDisponible },
                        { value: 'En ruta',         label: 'En ruta',        count: countEnRuta },
                        { value: 'En mantenimiento',label: 'Mantenimiento',  count: countMantenimiento },
                    ] as const)"
                    :key="tab.value"
                    @click="filterStatus = tab.value"
                    :class="[
                        'px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2',
                        filterStatus === tab.value
                            ? 'bg-white shadow-sm text-slate-800'
                            : 'text-slate-500 hover:text-slate-700'
                    ]"
                >
                    {{ tab.label }}
                    <span class="text-xs bg-slate-200 text-slate-600 rounded-full px-1.5 py-0.5 font-semibold">
                        {{ tab.count }}
                    </span>
                </button>
            </div>

            <!-- Search -->
            <div class="w-full lg:max-w-sm">
                <SearchBar
                    v-model="search"
                    placeholder="Buscar por placa, VIN o marca..."
                />
            </div>
        </div>

        <!-- ─── Table ──────────────────────────────────────── -->
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">

            <DataTable
                :columns="columns"
                :rows="paginatedVehicles"
                row-key="id"
                empty-message="No se encontraron vehículos"
            >
                <!-- Placa -->
                <template #cell-placa="{ value }">
                    <span class="font-mono font-bold text-xs tracking-widest text-slate-800">
                        {{ value }}
                    </span>
                </template>

                <!-- Vehículo (marca + modelo + año) -->
                <template #cell-vehiculo="{ row }">
                    <div>
                        <p class="font-semibold text-slate-800">
                            {{ (row as Vehicle).marca }} {{ (row as Vehicle).modelo }}
                        </p>
                        <p class="text-xs text-slate-400">
                            {{ (row as Vehicle).anio }}
                        </p>
                    </div>
                </template>

                <!-- Estado operativo -->
                <template #cell-estadoOperativo="{ value }">
                    <StatusBadge :status="value as string" />
                </template>

                <!-- Conductor asignado -->
                <template #cell-conductor="{ row }">
                    <p
                        v-if="(row as Vehicle).conductorAsignadoNombre"
                        class="font-medium text-slate-700"
                    >
                        {{ (row as Vehicle).conductorAsignadoNombre }}
                    </p>
                    <span v-else class="text-slate-400 text-sm">Sin asignar</span>
                </template>

                <!-- Kilometraje -->
                <template #cell-kilometraje="{ value }">
                    <span class="font-mono text-xs text-slate-700">
                        {{ formatKm(value as number) }}
                    </span>
                </template>

                <!-- SOAT — badge de estadoLegal + fecha de vencimiento -->
                <template #cell-soat="{ row }">
                    <template v-if="getDocEstado(row as Vehicle, 'SOAT') as ReturnType<typeof getDocEstado> !== null">
                        <div class="flex flex-col gap-0.5">
                            <StatusBadge :status="getDocEstado(row as Vehicle, 'SOAT')!.estadoLegal" />
                            <span class="font-mono text-xs text-slate-400">
                                {{ formatDate(getDocEstado(row as Vehicle, 'SOAT')!.fechaVencimiento) }}
                            </span>
                        </div>
                    </template>
                    <span v-else class="text-slate-400 text-xs">—</span>
                </template>

                <!-- Tecnomecánica — badge de estadoLegal + fecha de vencimiento -->
                <template #cell-tecnomecanica="{ row }">
                    <template v-if="getDocEstado(row as Vehicle, 'TECNOMECANICA') as ReturnType<typeof getDocEstado> !== null">
                        <div class="flex flex-col gap-0.5">
                            <StatusBadge :status="getDocEstado(row as Vehicle, 'TECNOMECANICA')!.estadoLegal" />
                            <span class="font-mono text-xs text-slate-400">
                                {{ formatDate(getDocEstado(row as Vehicle, 'TECNOMECANICA')!.fechaVencimiento) }}
                            </span>
                        </div>
                    </template>
                    <span v-else class="text-slate-400 text-xs">—</span>
                </template>

            </DataTable>

            <!-- ─── Pagination ─────────────────────────────── -->
            <div
                v-if="totalPages > 1"
                class="flex items-center justify-between px-4 py-3 border-t border-slate-100"
            >
                <p class="text-xs text-slate-500">
                    {{ filteredVehicles.length }} vehículos ·
                    Página {{ currentPage }} de {{ totalPages }}
                </p>

                <div class="flex items-center gap-2">
                    <button
                        @click="currentPage--"
                        :disabled="currentPage === 1"
                        class="px-3 py-1.5 text-sm rounded-lg border border-slate-200
                            text-slate-600 hover:bg-slate-50 disabled:opacity-40
                            disabled:cursor-not-allowed transition"
                    >
                        Anterior
                    </button>
                    <button
                        @click="currentPage++"
                        :disabled="currentPage === totalPages"
                        class="px-3 py-1.5 text-sm rounded-lg border border-slate-200
                            text-slate-600 hover:bg-slate-50 disabled:opacity-40
                            disabled:cursor-not-allowed transition"
                    >
                        Siguiente
                    </button>
                </div>
            </div>
        </div>

    </div>
</template>