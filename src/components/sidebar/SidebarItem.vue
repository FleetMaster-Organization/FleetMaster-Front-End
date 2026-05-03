<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import type { NavItem } from '@/types'

const props = defineProps<{ item: NavItem; collapsed: boolean }>()
const route = useRoute()
const open = ref(false)

const hasChildren = computed(() => !!props.item.children?.length)

const isActive = computed(() => {
    if (props.item.to) return route.path === props.item.to
    return props.item.children?.some(c => route.path.startsWith(c.to)) ?? false
})

function toggle() {
    if (hasChildren.value) open.value = !open.value
}
</script>

<template>
    <!-- Item with children -->
    <div v-if="hasChildren">
        <button
        @click="toggle"
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group"
        :class="isActive
            ? 'bg-blue-600 text-white'
            : 'text-slate-300 hover:bg-white/10 hover:text-white'"
        >
        <AppIcon :name="item.icon" class="w-5 h-5 shrink-0" />
        <span v-if="!collapsed" class="flex-1 text-left font-medium">{{ item.label }}</span>
        <AppIcon
            v-if="!collapsed"
            :name="open ? 'chevronDown' : 'chevronRight'"
            class="w-4 h-4 shrink-0 opacity-60"
        />
        </button>

        <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
        >
        <div v-if="open && !collapsed" class="mt-1 ml-8 space-y-1">
            <RouterLink
            v-for="child in item.children"
            :key="child.to"
            :to="child.to"
            class="block px-3 py-2 text-xs rounded-lg transition-all duration-150"
            :class="route.path === child.to
                ? 'bg-white/20 text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-white/10'"
            >
            {{ child.label }}
            </RouterLink>
        </div>
        </Transition>
    </div>

    <!-- Simple item -->
    <RouterLink
        v-else
        :to="item.to!"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
        :class="isActive
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
        : 'text-slate-300 hover:bg-white/10 hover:text-white'"
    >
        <AppIcon :name="item.icon" class="w-5 h-5 shrink-0" />
        <span v-if="!collapsed">{{ item.label }}</span>
    </RouterLink>
</template>