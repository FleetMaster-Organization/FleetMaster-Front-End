<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

import AppIcon from '@/components/ui/AppIcon.vue'

defineProps<{
    sidebarCollapsed: boolean
}>()

const emit = defineEmits<{
    (e: 'toggleSidebar'): void
}>()

const route = useRoute()

const notificationsCount = ref(3)
const showNotifications = ref(false)

const routeTitles: Record<string, string> = {
    'admin-dashboard': 'Dashboard',
    'admin-vehiculos': 'Vehículos',
    'admin-conductores': 'Conductores',
    'admin-asignaciones': 'Asignaciones',
    'admin-mantenimiento': 'Mantenimiento',
    'admin-alertas': 'Alertas',
    'admin-auditoria': 'Auditoría',
    'admin-usuarios': 'Usuarios',

    'coordinator-dashboard': 'Dashboard',
    'coordinator-vehicles': 'Vehículos',
    'coordinator-drivers': 'Conductores',
    'coordinator-assignments': 'Asignaciones',
    'coordinator-alerts': 'Alertas',

    'mechanic-dashboard': 'Dashboard',
    'mechanic-maintenance': 'Mantenimiento',
    'mechanic-history': 'Historial',
}

const pageTitle = computed(() =>
    routeTitles[route.name as string] ?? 'Dashboard'
)
</script>

<template>
    <header
        class="h-16 bg-slate-50 border-b border-slate-200 flex items-center justify-between px-6 shrink-0"
    >

        <!-- Left -->
        <div class="flex items-center gap-4">

            <!-- Toggle -->
            <button
                @click="emit('toggleSidebar')"
                class="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200 shadow-sm"
            >
                <AppIcon
                    name="menu"
                    class="w-5 h-5"
                />
            </button>

            <!-- Title -->
            <div>
                <h1 class="text-sm font-bold text-slate-800">
                    {{ pageTitle }}
                </h1>

                <p class="text-xs text-slate-400">
                    Sistema de gestión logística
                </p>
            </div>
        </div>

        <!-- Right -->
        <div class="flex items-center gap-3">

            <!-- Notifications -->
            <div class="relative">

                <button
                    @click="showNotifications = !showNotifications"
                    class="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200 shadow-sm relative"
                >
                    <AppIcon
                        name="bell"
                        class="w-5 h-5"
                    />

                    <span
                        v-if="notificationsCount > 0"
                        class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                    >
                        {{ notificationsCount }}
                    </span>
                </button>

                <!-- Dropdown -->
                <Transition
                    enter-active-class="transition duration-150 ease-out"
                    enter-from-class="scale-95 opacity-0"
                    enter-to-class="scale-100 opacity-100"
                    leave-active-class="transition duration-100 ease-in"
                    leave-from-class="scale-100 opacity-100"
                    leave-to-class="scale-95 opacity-0"
                >
                    <div
                        v-if="showNotifications"
                        class="absolute right-0 top-14 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
                    >

                        <!-- Header -->
                        <div class="px-5 py-4 border-b border-slate-100">
                            <p class="text-sm font-bold text-slate-800">
                                Notificaciones
                            </p>
                        </div>

                        <!-- Items -->
                        <div class="divide-y divide-slate-100">

                            <div class="px-5 py-4 hover:bg-slate-50 transition-colors">
                                <p class="text-sm font-semibold text-slate-800">
                                    SOAT próximo a vencer
                                </p>

                                <p class="text-xs text-slate-400 mt-1">
                                    Vehículo ABC123 · 3 días restantes
                                </p>
                            </div>

                            <div class="px-5 py-4 hover:bg-slate-50 transition-colors">
                                <p class="text-sm font-semibold text-slate-800">
                                    Vehículo ingresó a mantenimiento
                                </p>

                                <p class="text-xs text-slate-400 mt-1">
                                    Hace 1 hora
                                </p>
                            </div>

                            <div class="px-5 py-4 hover:bg-slate-50 transition-colors">
                                <p class="text-sm font-semibold text-slate-800">
                                    Licencia próxima a vencer
                                </p>

                                <p class="text-xs text-slate-400 mt-1">
                                    Conductor Carlos Pérez
                                </p>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div class="px-5 py-3 border-t border-slate-100 bg-slate-50">
                            <RouterLink
                                to="/admin/alertas"
                                class="text-xs font-semibold text-blue-600 hover:text-blue-700"
                                @click="showNotifications = false"
                            >
                                Ver todas las alertas →
                            </RouterLink>
                        </div>
                    </div>
                </Transition>
            </div>
        </div>
    </header>
</template>