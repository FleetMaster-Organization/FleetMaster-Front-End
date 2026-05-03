<script setup lang="ts">
import AppIcon from '@/components/ui/AppIcon.vue'
import type { VehicleStatData } from '@/types'

defineProps<VehicleStatData>()
</script>

<template>
    <div class="bg-white rounded-2xl border border-gray-100 px-6 py-5 flex items-center gap-4 shadow-sm">
        <div
        class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        :style="{ backgroundColor: accentColor + '1A', color: accentColor }"
        >
        <AppIcon :name="icon" class="w-5 h-5" />
        </div>
        <div>
        <p class="text-2xl font-bold text-gray-900">{{ value }}</p>
        <p class="text-xs text-gray-500">{{ label }}</p>
        </div>
        <div
        class="ml-auto w-1 self-stretch rounded-full"
        :style="{ backgroundColor: accentColor }"
        />
    </div>
</template>