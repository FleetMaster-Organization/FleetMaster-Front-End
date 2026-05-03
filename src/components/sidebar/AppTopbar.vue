<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'

defineProps<{ sidebarCollapsed: boolean }>()
const emit = defineEmits<{ (e: 'toggleSidebar'): void }>()

const route = useRoute()
const notificationsCount = ref(3)
const showNotifications = ref(false)

const routeTitles: Record<string, string> = {
    'admin-dashboard': 'Home',
    'admin-vehiculos': 'Vehículos',
    'admin-conductores': 'Conductores',
    'admin-asignaciones': 'Asignaciones',
    'admin-mantenimiento': 'Mantenimiento',
    'admin-alertas': 'Alertas',
    'admin-auditoria': 'Auditoría',
    'admin-usuarios': 'Usuarios',
}

const pageTitle = computed(() =>
    routeTitles[route.name as string] ?? 'Dashboard'
)

import { computed } from 'vue'
</script>

<template>
    <header class="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
        <!-- Left: toggle + breadcrumb -->
        <div class="flex items-center gap-3">
        <button
            @click="emit('toggleSidebar')"
            class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
            <AppIcon name="menu" class="w-5 h-5" />
        </button>
        <span class="text-sm font-semibold text-gray-700">{{ pageTitle }}</span>
        </div>

        <!-- Right: notifications -->
        <div class="flex items-center gap-2">
        <div class="relative">
            <button
            @click="showNotifications = !showNotifications"
            class="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors relative"
            >
            <AppIcon name="bell" class="w-5 h-5" />
            <span
                v-if="notificationsCount > 0"
                class="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
            >
                {{ notificationsCount }}
            </span>
            </button>

            <!-- Notification dropdown (simple) -->
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
                class="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
            >
                <div class="px-4 py-3 border-b border-gray-50">
                <p class="text-sm font-semibold text-gray-800">Notificaciones</p>
                </div>
                <div class="divide-y divide-gray-50">
                <div class="px-4 py-3 hover:bg-gray-50">
                    <p class="text-sm font-medium text-gray-800">SOAT próximo a vencer</p>
                    <p class="text-xs text-gray-400 mt-0.5">Vehículo ABC123 · 3 días</p>
                </div>
                <div class="px-4 py-3 hover:bg-gray-50">
                    <p class="text-sm font-medium text-gray-800">Técnico asignado</p>
                    <p class="text-xs text-gray-400 mt-0.5">Orden #482 · Hace 1 hora</p>
                </div>
                <div class="px-4 py-3 hover:bg-gray-50">
                    <p class="text-sm font-medium text-gray-800">Revisión técnica vence</p>
                    <p class="text-xs text-gray-400 mt-0.5">Vehículo XYZ789 · 7 días</p>
                </div>
                </div>
                <div class="px-4 py-3 border-t border-gray-50 text-center">
                <RouterLink to="/admin/alertas" class="text-xs font-semibold text-blue-600 hover:underline" @click="showNotifications = false">
                    Ver todas las alertas →
                </RouterLink>
                </div>
            </div>
            </Transition>
        </div>
        </div>
    </header>
</template>