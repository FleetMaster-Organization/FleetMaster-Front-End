<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import StatCard from '@/components/dashboard/StatCard.vue'
import VehicleStatBar from '@/components/dashboard/VehicleStatBar.vue'
import AlertCard from '@/components/dashboard/AlertCard.vue'
import ActivityList from '@/components/dashboard/ActivityList.vue'

import { useVehiclesStore } from '@/stores/vehicles'
import { useDriversStore } from '@/stores/drivers'
import { useAssignmentsStore } from '@/stores/assignments'
import { useAlertsStore } from '@/stores/alerts'

import type {
    StatCardData,
    VehicleStatData,
    Alert,
    ActivityItem,
    Assignment,
} from '@/types'

const vehiclesStore = useVehiclesStore()
const driversStore = useDriversStore()
const assignmentsStore = useAssignmentsStore()
const alertsStore = useAlertsStore()

// ─── Top stats ───────────────────────────────────────────────
const topStats = computed<StatCardData[]>(() => {
    const availableVehicles = vehiclesStore.vehicles.filter(
        vehicle =>
            vehicle.estadoOperativo === 'Disponible' &&
            vehicle.estadoAdministrativo === 'Activo'
    ).length

    const availableDrivers = driversStore.drivers.filter(driver =>
        driver.estadoLaboral === 'ACTIVO' &&
        !driver.vehiculoAsignadoId &&
        driver.licencias.some(license => license.estadoLegal !== 'Vencida')
    ).length

    return [
        {
            label: 'Vehículos Disponibles',
            value: availableVehicles,
            icon: 'truck',
            accent: 'green',
            subtitle: 'Listos para asignación',
        },
        {
            label: 'Conductores Disponibles',
            value: availableDrivers,
            icon: 'users',
            accent: 'blue',
            subtitle: 'Con licencia vigente',
        },
        {
            label: 'Asignaciones Activas',
            value: assignmentsStore.activas.length,
            icon: 'link',
            accent: 'amber',
            subtitle: 'Vehículos en ruta',
        },
        {
            label: 'Alertas Pendientes',
            value: alertsStore.pendientes.length,
            icon: 'bell',
            accent: 'red',
            subtitle: 'Requieren atención',
        },
    ]
})

// ─── Vehicle status bars ─────────────────────────────────────
const vehicleStats = computed<VehicleStatData[]>(() => [
    {
        label: 'Disponibles',
        value: vehiclesStore.availableVehicles,
        icon: 'check-circle',
        accentColor: '#16a34a',
    },
    {
        label: 'En ruta',
        value: vehiclesStore.inRouteVehicles,
        icon: 'truck',
        accentColor: '#2563eb',
    },
    {
        label: 'Mantenimiento',
        value: vehiclesStore.inMaintenanceVehicles,
        icon: 'wrench',
        accentColor: '#d97706',
    },
])

// ─── Critical alerts ─────────────────────────────────────────
const criticalAlerts = computed<Alert[]>(() =>
    alertsStore.pendientes.slice(0, 5).map(alert => ({
        id: alert.id,
        title: alert.tipo,
        description: alert.entidadNombre,
        daysLeft: alert.diasRestantes,
        severity: alert.severidad === 'Vencido' ? 'critical' : 'warning',
    }))
)

// ─── Recent assignments activity ─────────────────────────────
const recentActivities = computed<ActivityItem[]>(() =>
    assignmentsStore.activas.slice(0, 5).map((assignment: Assignment) => ({
        id: assignment.id,
        title: 'Asignación activa',
        description: `${assignment.vehiculoPlaca} asignado a ${assignment.conductorNombre}`,
        actor: assignment.usuarioResponsable,
        timeAgo: new Intl.DateTimeFormat('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(new Date(assignment.fechaInicio)),
        icon: '🚛',
    }))
)
</script>

<template>
    <div class="p-6 space-y-6 max-w-400">
        <!-- Header -->
        <div>
            <h1 class="text-2xl font-bold text-slate-800 tracking-tight">
                Dashboard
            </h1>
            <p class="text-sm text-slate-500 mt-1">
                Resumen operativo de flota y asignaciones
            </p>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
                v-for="stat in topStats"
                :key="stat.label"
                v-bind="stat"
            />
        </div>

        <!-- Vehicle overview -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <VehicleStatBar
                v-for="stat in vehicleStats"
                :key="stat.label"
                v-bind="stat"
            />
        </div>

        <!-- Bottom panels -->
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <!-- Recent assignments -->
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
                    <div>
                        <h2 class="text-base font-bold text-slate-800">
                            Asignaciones Activas
                        </h2>
                        <p class="text-xs text-slate-400 mt-0.5">
                            Vehículos actualmente en operación
                        </p>
                    </div>

                    <RouterLink
                        to="/coordinator/asignaciones"
                        class="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                        Ver todas →
                    </RouterLink>
                </div>

                <div class="px-6 py-2">
                    <ActivityList :items="recentActivities" />
                </div>
            </div>

            <!-- Critical alerts -->
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
                    <div>
                        <h2 class="text-base font-bold text-slate-800">
                            Alertas Críticas
                        </h2>
                        <p class="text-xs text-slate-400 mt-0.5">
                            Documentos y licencias por vencer
                        </p>
                    </div>

                    <RouterLink
                        to="/coordinator/alertas"
                        class="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                        Ver alertas →
                    </RouterLink>
                </div>

                <div class="px-6 py-2">
                    <AlertCard
                        v-for="alert in criticalAlerts"
                        :key="alert.id"
                        :alert="alert"
                    />
                </div>
            </div>
        </div>
    </div>
</template>
