<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SearchBar from '@/components/ui/SearchBar.vue'
import DataTable from '@/components/ui/DataTable.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'

import { useDriversStore } from '@/stores/drivers'

import type {
    Driver,
    DriverEmploymentStatus,
    DriverLicense,
} from '@/types'

const driversStore = useDriversStore()

// ─── Search & filters ────────────────────────────────────────
const search = ref('')
const filterStatus = ref<'Todos' | DriverEmploymentStatus>('Todos')

// ─── Pagination ──────────────────────────────────────────────
const PAGE_SIZE = 20
const currentPage = ref(1)

watch([search, filterStatus], () => { currentPage.value = 1 })

// ─── Table columns ───────────────────────────────────────────
const columns = [
    { key: 'nombre',                label: 'Conductor' },
    { key: 'cedula',                label: 'Cédula',   width: '140px' },
    { key: 'estadoLaboral',         label: 'Estado',   width: '150px' },
    { key: 'vehiculoAsignadoPlaca', label: 'Vehículo', width: '140px' },
    { key: 'licencias',             label: 'Licencias' },
]

// ─── Stats — derivadas del mismo universo que la tabla ───────
const totalDrivers    = computed(() => driversStore.drivers.length)
const activeDrivers   = computed(() =>
    driversStore.drivers.filter(d => d.estadoLaboral === 'ACTIVO').length
)
const inactiveDrivers = computed(() =>
    driversStore.drivers.filter(d => d.estadoLaboral === 'INACTIVO').length
)
const retiredDrivers  = computed(() =>
    driversStore.drivers.filter(d => d.estadoLaboral === 'RETIRADO').length
)

// ─── Filtering ───────────────────────────────────────────────
const filteredDrivers = computed(() => {
    let result = driversStore.drivers

    if (filterStatus.value !== 'Todos') {
        result = result.filter(d => d.estadoLaboral === filterStatus.value)
    }

    if (search.value.trim()) {
        const query = search.value.toLowerCase()
        result = result.filter(d =>
            d.nombre.toLowerCase().includes(query) ||
            d.cedula.includes(query)
        )
    }

    return result
})

// ─── Pagination computed ─────────────────────────────────────
const totalPages = computed(() =>
    Math.max(1, Math.ceil(filteredDrivers.value.length / PAGE_SIZE))
)

const paginatedDrivers = computed(() => {
    const start = (currentPage.value - 1) * PAGE_SIZE
    return filteredDrivers.value.slice(start, start + PAGE_SIZE)
})

// ─── Helpers ─────────────────────────────────────────────────
function getLicenseClass(status: string): string {
    switch (status) {
        case 'Vigente':    return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        case 'Por vencer': return 'bg-amber-50 text-amber-700 border border-amber-200'
        case 'Vencida':    return 'bg-red-50 text-red-700 border border-red-200'
        default:           return 'bg-slate-100 text-slate-600 border border-slate-200'
    }
}

function sortLicenses(licenses: DriverLicense[]): DriverLicense[] {
    const priority: Record<string, number> = {
        Vencida: 0,
        'Por vencer': 1,
        Vigente: 2,
    }
    return [...licenses].sort(
        (a, b) => (priority[a.estadoLegal] ?? 0) - (priority[b.estadoLegal] ?? 0)
    )
}
</script>

<template>
    <div class="p-6 space-y-6">

        <!-- ─── Header ─────────────────────────────────────── -->
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
                <h1 class="text-2xl font-bold text-slate-800">
                    Conductores
                </h1>

                <p class="text-sm text-slate-500 mt-1">
                    Consulta del personal de conducción y estado legal de licencias
                </p>
            </div>
        </div>

        <!-- ─── Stats cards ────────────────────────────────── -->
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

            <div class="bg-white border border-slate-200 rounded-xl p-5">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Total conductores
                </p>
                <h3 class="text-3xl font-bold text-slate-800 mt-2">
                    {{ totalDrivers }}
                </h3>
            </div>

            <div class="bg-white border border-slate-200 rounded-xl p-5">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Activos
                </p>
                <h3 class="text-3xl font-bold text-emerald-600 mt-2">
                    {{ activeDrivers }}
                </h3>
            </div>

            <div class="bg-white border border-slate-200 rounded-xl p-5">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Inactivos
                </p>
                <h3 class="text-3xl font-bold text-amber-600 mt-2">
                    {{ inactiveDrivers }}
                </h3>
            </div>

            <div class="bg-white border border-slate-200 rounded-xl p-5">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Retirados
                </p>
                <h3 class="text-3xl font-bold text-slate-600 mt-2">
                    {{ retiredDrivers }}
                </h3>
            </div>
        </div>

        <!-- ─── Filters ────────────────────────────────────── -->
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

            <!-- Status tabs -->
            <div class="bg-slate-100 p-1 rounded-xl flex flex-wrap gap-1">

                <button
                    v-for="tab in [
                        { value: 'Todos',    label: 'Todos',     count: totalDrivers },
                        { value: 'ACTIVO',   label: 'Activos',   count: activeDrivers },
                        { value: 'INACTIVO', label: 'Inactivos', count: inactiveDrivers },
                        { value: 'RETIRADO', label: 'Retirados', count: retiredDrivers },
                    ]"
                    :key="tab.value"
                    @click="filterStatus = tab.value as typeof filterStatus"
                    :class="[
                        'px-4 py-2 rounded-lg text-sm font-medium transition',
                        filterStatus === tab.value
                            ? 'bg-white shadow-sm text-slate-800'
                            : 'text-slate-500 hover:text-slate-700'
                    ]"
                >
                    {{ tab.label }}
                    <span class="ml-1 text-xs">{{ tab.count }}</span>
                </button>
            </div>

            <!-- Search -->
            <div class="w-full lg:max-w-sm">
                <SearchBar
                    v-model="search"
                    placeholder="Buscar por nombre o cédula..."
                />
            </div>
        </div>

        <!-- ─── Table ──────────────────────────────────────── -->
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">

            <DataTable
                :columns="columns"
                :rows="paginatedDrivers"
                :loading="driversStore.isLoading"
                row-key="id"
                empty-message="No se encontraron conductores."
            >

                <!-- Nombre -->
                <template #cell-nombre="{ row }">
                    <div class="space-y-1">
                        <p class="font-semibold text-slate-800">
                            {{ (row as Driver).nombre }}
                        </p>
                        <p class="text-xs text-slate-400">
                            {{ (row as Driver).email }}
                        </p>
                    </div>
                </template>

                <!-- Cédula -->
                <template #cell-cedula="{ row }">
                    <span class="font-mono text-xs text-slate-700">
                        {{ (row as Driver).cedula }}
                    </span>
                </template>

                <!-- Estado -->
                <template #cell-estadoLaboral="{ row }">
                    <div class="space-y-1">
                        <StatusBadge :status="(row as Driver).estadoLaboral" />
                        <p class="text-xs text-slate-400">
                            {{ (row as Driver).subestadoLaboral }}
                        </p>
                    </div>
                </template>

                <!-- Vehículo -->
                <template #cell-vehiculoAsignadoPlaca="{ row }">
                    <span
                        class="font-mono text-xs tracking-widest"
                        :class="
                            (row as Driver).vehiculoAsignadoPlaca
                                ? 'text-blue-700 font-bold'
                                : 'text-slate-400'
                        "
                    >
                        {{ (row as Driver).vehiculoAsignadoPlaca ?? 'Sin asignar' }}
                    </span>
                </template>

                <!-- Licencias -->
                <template #cell-licencias="{ row }">
                    <div class="flex flex-wrap gap-1">
                        <span
                            v-for="license in sortLicenses((row as Driver).licencias)"
                            :key="license.id"
                            class="px-2 py-0.5 rounded-lg text-xs font-semibold"
                            :class="getLicenseClass(license.estadoLegal)"
                        >
                            {{ license.categoria }}
                        </span>
                    </div>
                </template>

                <!-- Pagination -->
                <template #pagination>
                    <div
                        v-if="totalPages > 1"
                        class="flex items-center justify-between px-4 py-3 border-t border-slate-200"
                    >
                        <p class="text-xs text-slate-400">
                            Página {{ currentPage }} de {{ totalPages }}
                            ({{ filteredDrivers.length }} registros)
                        </p>

                        <div class="flex gap-2">
                            <button
                                @click="currentPage--"
                                :disabled="currentPage === 1"
                                class="px-3 py-1 text-xs rounded-lg border border-slate-200
                                    text-slate-600 hover:bg-slate-50 disabled:opacity-40
                                    disabled:cursor-not-allowed transition"
                            >
                                Anterior
                            </button>

                            <button
                                @click="currentPage++"
                                :disabled="currentPage === totalPages"
                                class="px-3 py-1 text-xs rounded-lg border border-slate-200
                                    text-slate-600 hover:bg-slate-50 disabled:opacity-40
                                    disabled:cursor-not-allowed transition"
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