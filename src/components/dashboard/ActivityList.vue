<script setup lang="ts">
import type { ActivityItem } from '@/types'

defineProps<{ items: ActivityItem[] }>()
</script>

<template>
    <div class="space-y-0">
        <div
        v-for="item in items"
        :key="item.id"
        class="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0"
        >
        <div class="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
            <span class="text-sm">{{ item.icon }}</span>
        </div>
        <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-800">{{ item.title }}</p>
            <p class="text-xs text-gray-500 truncate">{{ item.description }}</p>
            <p class="text-xs text-gray-400 mt-0.5">
            <span class="font-medium text-gray-500">{{ item.actor }}</span>
            · {{ item.timeAgo }}
            </p>
        </div>
        </div>
    </div>
</template>