<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useVehiclesStore } from '@/stores/vehicles'
import { useDriversStore } from '@/stores/drivers'
import { useAssignmentsStore } from '@/stores/assignments'
import { useAlertsStore } from '@/stores/alerts'
import StatCard from '@/components/dashboard/StatCard.vue'
import VehicleStatBar from '@/components/dashboard/VehicleStatBar.vue'
import AlertCard from '@/components/dashboard/AlertCard.vue'
import ActivityList from '@/components/dashboard/ActivityList.vue'
import type { StatCardData, VehicleStatData, Alert, ActivityItem } from '@/types'

const vehiclesStore = useVehiclesStore()
const driversStore = useDriversStore()
const assignmentsStore = useAssignmentsStore()
const alertsStore = useAlertsStore()

const isLoading = ref(true)

onMounted(async () => {
    try {
        await Promise.all([
            vehiclesStore.loadVehicles(),
            driversStore.loadDrivers(),
            assignmentsStore.loadAssignments(),
            alertsStore.loadAlerts(),
        ])
    } finally {
        isLoading.value = false
    }
})

// Helper para iconos de auditoría
function getActionIcon(action: string): string {
    const act = action.toUpperCase()
    if (act.includes('VEHICULO')) return '🚛'
    if (act.includes('CONDUCTOR')) return '👤'
    if (act.includes('MANTENIMIENTO')) return '🔧'
    if (act.includes('ASIGNACION')) return '📋'
    if (act.includes('ALERTA')) return '⚠️'
    return '📝'
}

// Helper para tiempo transcurrido
function formatTimeAgo(isoDate: string): string {
    const diff = Date.now() - new Date(isoDate).getTime()
    const diffMins = Math.floor(diff / 60000)
    if (diffMins < 1) return 'Ahora mismo'
    if (diffMins < 60) return `Hace ${diffMins} min`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `Hace ${diffHours} h`
    const diffDays = Math.floor(diffHours / 24)
    return `Hace ${diffDays} d`
}

// ─── Stats data dinámicos ──────────────────────────────────────
const topStats = computed<StatCardData[]>(() => {
    const totalV = vehiclesStore.vehicles.length
    const activeV = vehiclesStore.vehicles.filter(v => v.estadoAdministrativo === 'Activo').length
    
    const totalD = driversStore.drivers.length
    const activeD = driversStore.drivers.filter(d => d.estadoLaboral === 'ACTIVO').length
    
    const maintenanceV = vehiclesStore.vehicles.filter(v => v.estadoOperativo === 'En mantenimiento').length
    const pendingAlerts = alertsStore.pendientes.length

    return [
        {
            label: 'Vehículos Activos',
            value: activeV,
            icon: 'truck',
            accent: 'blue',
            subtitle: `${totalV} vehículos totales`,
        },
        {
            label: 'Conductores Activos',
            value: activeD,
            icon: 'users',
            accent: 'green',
            subtitle: `${totalD} conductores totales`,
        },
        {
            label: 'En Mantenimiento',
            value: maintenanceV,
            icon: 'wrench',
            accent: 'amber',
            subtitle: 'Vehículos en taller',
        },
        {
            label: 'Alertas Pendientes',
            value: pendingAlerts,
            icon: 'alert-triangle',
            accent: 'red',
            subtitle: 'Requieren atención',
        },
    ]
})

const vehicleStats = computed<VehicleStatData[]>(() => {
    const available = vehiclesStore.vehicles.filter(v => v.estadoOperativo === 'Disponible').length
    const assigned = vehiclesStore.vehicles.filter(v => v.estadoOperativo === 'En ruta').length
    const maintenance = vehiclesStore.vehicles.filter(v => v.estadoOperativo === 'En mantenimiento').length

    return [
        { label: 'Disponibles', value: available, icon: 'check-circle', accentColor: '#16a34a' },
        { label: 'Asignados', value: assigned, icon: 'truck', accentColor: '#2563eb' },
        { label: 'Mantenimiento', value: maintenance, icon: 'wrench', accentColor: '#d97706' },
    ]
})

// ─── Alerts data dinámicos ──────────────────────────────────────
const alerts = computed<Alert[]>(() => {
    return alertsStore.pendientes.slice(0, 3).map(a => ({
        id: a.id,
        title: `${a.tipo} - ${a.entidadNombre}`,
        description: a.diasRestantes < 0 
            ? `Venció hace ${Math.abs(a.diasRestantes)} días` 
            : `Vence en ${a.diasRestantes} días`,
        daysLeft: a.diasRestantes,
        severity: a.diasRestantes < 0 ? 'critical' : 'warning',
    }))
})

// ─── Activity data dinámicos ────────────────────────────────────
const activities = computed<ActivityItem[]>(() => {
    return assignmentsStore.assignments.slice(0, 4).map(asg => {
        const isClosed = asg.estado === 'Finalizada'
        return {
            id: asg.id,
            title: isClosed ? 'Asignación Finalizada' : 'Nueva Asignación de Vehículo',
            description: `Vehículo ${asg.vehiculoPlaca} asignado al conductor ${asg.conductorNombre}.`,
            actor: asg.usuarioResponsable || 'Coordinador',
            timeAgo: formatTimeAgo(asg.fechaInicio || new Date().toISOString()),
            icon: '📋',
        }
    })
})

</script>

<template>
    <div class="space-y-6 max-w-350">
        <!-- Page header -->
        <div>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p class="text-sm text-gray-500 mt-0.5">Resumen general del sistema</p>
        </div>

        <!-- ─── Skeleton de carga ─────────────────────────────────── -->
        <template v-if="isLoading">
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div v-for="i in 4" :key="i" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
                    <div class="flex items-center justify-between mb-4">
                        <div class="h-4 bg-slate-200 rounded w-1/2"/>
                        <div class="w-10 h-10 bg-slate-200 rounded-xl"/>
                    </div>
                    <div class="h-8 bg-slate-200 rounded w-1/3 mb-2"/>
                    <div class="h-3 bg-slate-100 rounded w-2/3"/>
                </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div v-for="i in 3" :key="i" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
                    <div class="h-4 bg-slate-200 rounded w-1/3 mb-3"/>
                    <div class="h-6 bg-slate-200 rounded w-1/4 mb-2"/>
                    <div class="h-2 bg-slate-100 rounded-full"/>
                </div>
            </div>
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div v-for="i in 2" :key="i" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-48 animate-pulse">
                    <div class="h-4 bg-slate-200 rounded w-1/3 mb-4"/>
                    <div v-for="j in 3" :key="j" class="h-3 bg-slate-100 rounded mb-3"/>
                </div>
            </div>
        </template>

        <!-- ─── Contenido cargado ─────────────────────────────────── -->
        <template v-else>

        <!-- Top stat cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard v-for="stat in topStats" :key="stat.label" v-bind="stat" />
        </div>

        <!-- Vehicle breakdown strip -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <VehicleStatBar v-for="stat in vehicleStats" :key="stat.label" v-bind="stat" />
        </div>

        <!-- Bottom panels -->
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">

        <!-- Critical alerts -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-50">
            <div>
                <h2 class="text-base font-bold text-gray-900">Alertas Críticas</h2>
                <p class="text-xs text-gray-400 mt-0.5">Documentos próximos a vencer</p>
            </div>
            <RouterLink
                to="/admin/alertas"
                class="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
                Ver todas →
            </RouterLink>
            </div>
            <div class="px-6 py-2">
            <AlertCard v-for="alert in alerts" :key="alert.id" :alert="alert" />
            </div>
        </div>

        <!-- Recent activity -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-50">
            <div>
                <h2 class="text-base font-bold text-gray-900">Actividad Reciente</h2>
                <p class="text-xs text-gray-400 mt-0.5">Últimas acciones en el sistema</p>
            </div>
            <RouterLink
                to="/admin/asignaciones"
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

        </template>
    </div>
</template>