<script setup lang="ts">
import type { Alert } from '@/types'

defineProps<{ alert: Alert }>()

const severityConfig = {
    critical: {
        badge: 'bg-red-100 text-red-700',
        dot: 'bg-red-500',
        icon: '🔴',
        label: 'Crítico',
    },
    warning: {
        badge: 'bg-amber-100 text-amber-700',
        dot: 'bg-amber-400',
        icon: '🟡',
        label: 'Advertencia',
    },
    info: {
        badge: 'bg-blue-100 text-blue-700',
        dot: 'bg-blue-400',
        icon: '🔵',
        label: 'Info',
    },
}
</script>

<template>
    <div class="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
        <div class="flex items-center gap-3">
        <div
            class="w-9 h-9 rounded-lg flex items-center justify-center bg-red-50 shrink-0"
        >
            <span class="text-sm">📄</span>
        </div>
        <div>
            <p class="text-sm font-semibold text-gray-800">{{ alert.title }}</p>
            <p class="text-xs text-gray-400">{{ alert.description }}</p>
        </div>
        </div>
        <div class="flex items-center gap-2 shrink-0 ml-4">
        <span class="text-xs text-gray-400">{{ alert.daysLeft }} días</span>
        <span
            class="text-xs font-semibold px-2 py-0.5 rounded-full"
            :class="severityConfig[alert.severity].badge"
        >
            {{ severityConfig[alert.severity].label }}
        </span>
        </div>
    </div>
</template>