<script setup lang="ts">
import AppIcon from '@/components/ui/AppIcon.vue'
import type { StatCardData } from '@/types'

defineProps<StatCardData>()

const accentClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
}
</script>

<template>
    <div
        class="bg-white rounded-2xl border border-gray-100 p-6 flex items-start justify-between shadow-sm hover:shadow-md transition-shadow duration-200"
        :class="{
        'border-l-4 border-l-amber-400 bg-amber-50/30': accent === 'amber',
        'border-l-4 border-l-red-400 bg-red-50/30': accent === 'red',
        }"
    >
        <div class="flex flex-col gap-1">
        <span class="text-sm font-medium text-gray-500">{{ label }}</span>
        <div class="flex items-baseline gap-2">
            <span class="text-4xl font-bold text-gray-900 tracking-tight">{{ value }}</span>
            <span
            v-if="trend"
            class="text-xs font-semibold px-1.5 py-0.5 rounded-full"
            :class="trend.positive ? 'text-emerald-700 bg-emerald-100' : 'text-red-700 bg-red-100'"
            >
            {{ trend.positive ? '↑' : '↓' }} {{ trend.value }}
            </span>
        </div>
        <span v-if="subtitle" class="text-xs text-gray-400 mt-0.5">{{ subtitle }}</span>
        </div>

        <div
        class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        :class="accentClasses[accent ?? 'blue']"
        >
        <AppIcon :name="icon" class="w-5 h-5" />
        </div>
    </div>
</template>