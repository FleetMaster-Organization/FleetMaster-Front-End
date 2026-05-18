<script setup lang="ts">
import { computed } from 'vue'

import StatCard from '@/components/dashboard/StatCard.vue'
import VehicleStatBar from '@/components/dashboard/VehicleStatBar.vue'
import ActivityList from '@/components/dashboard/ActivityList.vue'

import { useMaintenanceStore } from '@/stores/maintenance'
import { useVehiclesStore } from '@/stores/vehicles'

import type {
    ActivityItem,
    StatCardData,
    VehicleStatData,
} from '@/types'

const maintenanceStore = useMaintenanceStore()
const vehiclesStore = useVehiclesStore()

// ─────────────────────────────────────────────────────────────
// Dashboard stats
// ─────────────────────────────────────────────────────────────

const topStats = computed<StatCardData[]>(() => [
    {
        label: 'Mantenimientos Abiertos',
        value: maintenanceStore.abiertos.length,
        icon: 'wrench',
        accent: 'amber',
        subtitle: 'Vehículos actualmente en taller',
    },
    {
        label: 'Vehículos en Taller',
        value: vehiclesStore.inMaintenanceVehicles,
        icon: 'truck',
        accent: 'blue',
        subtitle: 'Estado operativo en mantenimiento',
    },
    {
        label: 'Mantenimientos Cerrados',
        value: maintenanceStore.cerrados.length,
        icon: 'check-circle',
        accent: 'green',
        subtitle: 'Registros finalizados',
    },
    {
        label: 'Próximos Mantenimientos',
        value: maintenanceStore.cerrados.filter(r => r.proximoMantenimiento).length,
        icon: 'calendar',
        accent: 'red',
        subtitle: 'Programaciones futuras registradas',
    },
])

// ─────────────────────────────────────────────────────────────
// Vehicle status strip
// ─────────────────────────────────────────────────────────────

const vehicleStats = computed<VehicleStatData[]>(() => [
    {
        label: 'Disponibles',
        value: vehiclesStore.availableVehicles,
        icon: 'check-circle',
        accentColor: '#16a34a',
    },
    {
        label: 'En mantenimiento',
        value: vehiclesStore.inMaintenanceVehicles,
        icon: 'wrench',
        accentColor: '#d97706',
    },
    {
        label: 'En ruta',
        value: vehiclesStore.inRouteVehicles,
        icon: 'truck',
        accentColor: '#2563eb',
    },
])

// ─────────────────────────────────────────────────────────────
// Recent maintenance activity
// ─────────────────────────────────────────────────────────────

const activities = computed<ActivityItem[]>(() => {
    return maintenanceStore.cerrados
        .slice(0, 5)
        .map(record => ({
            id: record.id,
            title: 'Mantenimiento completado',
            description: `${record.tipo} — Vehículo ${record.vehiculoPlaca}`,
            actor: record.tecnico,
            timeAgo: record.fechaSalida ?? 'Reciente',
            icon: '🔧',
        }))
})

// ─────────────────────────────────────────────────────────────
// Vehicles currently in maintenance
// ─────────────────────────────────────────────────────────────

const activeMaintenances = computed(() =>
    maintenanceStore.abiertos.slice(0, 5)
)

function formatDate(date: string | null) {
    if (!date) return '—'

    return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(new Date(date))
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(value)
}
</script>

<template>
    <div class="space-y-6 max-w-[1400px]">
        <!-- Header -->
        <div>
            <h1 class="text-2xl font-bold text-gray-900 tracking-tight">
                Dashboard Mecánico
            </h1>

            <p class="text-sm text-gray-500 mt-0.5">
                Resumen operativo del taller
            </p>
        </div>

        <!-- Top stats -->
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
                v-for="stat in topStats"
                :key="stat.label"
                v-bind="stat"
            />
        </div>

        <!-- Vehicle status strip -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <VehicleStatBar
                v-for="stat in vehicleStats"
                :key="stat.label"
                v-bind="stat"
            />
        </div>

        <!-- Bottom panels -->
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">

            <!-- Vehicles in maintenance -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-50">
                    <div>
                        <h2 class="text-base font-bold text-gray-900">
                            Vehículos en mantenimiento
                        </h2>

                        <p class="text-xs text-gray-400 mt-0.5">
                            Vehículos actualmente en taller
                        </p>
                    </div>

                    <RouterLink
                        to="/mechanic/mantenimiento"
                        class="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                        Ver todos →
                    </RouterLink>
                </div>

                <div class="divide-y divide-gray-100">
                    <div
                        v-for="record in activeMaintenances"
                        :key="record.id"
                        class="px-6 py-4 flex items-start justify-between gap-4"
                    >
                        <div class="space-y-1 min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <p class="font-mono font-bold text-xs tracking-widest text-slate-800">
                                    {{ record.vehiculoPlaca }}
                                </p>

                                <span class="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
                                    {{ record.tipo }}
                                </span>
                            </div>

                            <p class="text-sm text-slate-700 truncate">
                                {{ record.descripcion }}
                            </p>

                            <div class="flex items-center gap-4 text-xs text-slate-400">
                                <span>Técnico: {{ record.tecnico }}</span>
                                <span>{{ formatDate(record.fechaIngreso) }}</span>
                            </div>
                        </div>

                        <div class="text-right shrink-0">
                            <p class="font-mono text-xs text-slate-500">
                                {{ formatCurrency(record.costo) }}
                            </p>
                        </div>
                    </div>

                    <div
                        v-if="!activeMaintenances.length"
                        class="px-6 py-10 text-center text-sm text-slate-400"
                    >
                        No hay vehículos en mantenimiento.
                    </div>
                </div>
            </div>

            <!-- Recent activity -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-50">
                    <div>
                        <h2 class="text-base font-bold text-gray-900">
                            Actividad reciente
                        </h2>

                        <p class="text-xs text-gray-400 mt-0.5">
                            Últimos mantenimientos registrados
                        </p>
                    </div>

                    <RouterLink
                        to="/mechanic/historial"
                        class="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                        Ver historial →
                    </RouterLink>
                </div>

                <div class="px-6 py-2">
                    <ActivityList :items="activities" />
                </div>
            </div>
        </div>
    </div>
</template>
```
