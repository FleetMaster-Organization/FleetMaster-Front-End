<script setup lang="ts">
import StatCard from '@/components/dashboard/StatCard.vue'
import VehicleStatBar from '@/components/dashboard/VehicleStatBar.vue'
import AlertCard from '@/components/dashboard/AlertCard.vue'
import ActivityList from '@/components/dashboard/ActivityList.vue'
import type { StatCardData, VehicleStatData, Alert, ActivityItem } from '@/types'

// ─── Stats data ───────────────────────────────────────────────
const topStats: StatCardData[] = [
    {
        label: 'Vehículos Activos',
        value: 38,
        icon: 'truck',
        accent: 'blue',
        trend: { value: '+3%', positive: true },
        subtitle: '45 vehículos totales',
    },
    {
        label: 'Conductores Activos',
        value: 48,
        icon: 'users',
        accent: 'green',
        trend: { value: '+5%', positive: true },
        subtitle: '52 conductores totales',
    },
    {
        label: 'En Mantenimiento',
        value: 5,
        icon: 'wrench',
        accent: 'amber',
        subtitle: 'Vehículos en taller',
    },
    {
        label: 'Alertas Pendientes',
        value: 3,
        icon: 'alert-triangle',
        accent: 'red',
        subtitle: 'Requieren atención',
    },
]

const vehicleStats: VehicleStatData[] = [
    { label: 'Disponibles', value: 12, icon: 'check-circle', accentColor: '#16a34a' },
    { label: 'Asignados', value: 26, icon: 'truck', accentColor: '#2563eb' },
    { label: 'Mantenimiento', value: 5, icon: 'wrench', accentColor: '#d97706' },
]

// ─── Alerts data ──────────────────────────────────────────────
const alerts: Alert[] = [
    { id: '1', title: 'SOAT - ABC123', description: 'Diomedes Díaz', daysLeft: 3, severity: 'critical' },
    { id: '2', title: 'Revisión técnica - XYZ789', description: 'María García', daysLeft: 7, severity: 'warning' },
    { id: '3', title: 'Seguro vehicular - DEF456', description: 'Carlos López', daysLeft: 12, severity: 'warning' },
]

// ─── Activity data ────────────────────────────────────────────
const activities: ActivityItem[] = [
    {
        id: '1',
        title: 'Vehículo asignado',
        description: 'ABC123 asignado a Diomedes Díaz',
        actor: 'Administrador',
        timeAgo: 'Hace 2 horas',
        icon: '🚛',
    },
    {
        id: '2',
        title: 'Mantenimiento completado',
        description: 'Cambio de aceite — Vehículo XYZ789',
        actor: 'Técnico Juan',
        timeAgo: 'Hace 4 horas',
        icon: '🔧',
    },
    {
        id: '3',
        title: 'Nuevo conductor registrado',
        description: 'Pedro Martínez — Licencia C2',
        actor: 'Administrador',
        timeAgo: 'Hace 6 horas',
        icon: '👤',
    },
    {
        id: '4',
        title: 'Alerta generada',
        description: 'SOAT próximo a vencer — ABC123',
        actor: 'Sistema',
        timeAgo: 'Hace 8 horas',
        icon: '⚠️',
    },
]
</script>

<template>
    <div class="space-y-6 max-w-350">
        <!-- Page header -->
        <div>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p class="text-sm text-gray-500 mt-0.5">Resumen general del sistema</p>
        </div>

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
                to="/admin/auditoria"
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