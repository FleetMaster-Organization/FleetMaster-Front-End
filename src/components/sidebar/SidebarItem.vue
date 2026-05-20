<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

import AppIcon from '@/components/ui/AppIcon.vue'

import type { NavItem } from '@/types'

const props = defineProps<{
    item: NavItem
    collapsed: boolean
}>()

const route = useRoute()

const open = ref(false)

const hasChildren = computed(() =>
    !!props.item.children?.length
)

const isActive = computed(() => {
    if (props.item.to)
        return route.path === props.item.to

    return props.item.children?.some(c =>
        route.path.startsWith(c.to)
    ) ?? false
})

function toggle() {
    if (hasChildren.value)
        open.value = !open.value
}
</script>

<template>

    <!-- Item with children -->
    <div v-if="hasChildren">

        <button
            @click="toggle"
            class="w-full flex items-center rounded-2xl transition-all duration-200 group"
            :class="[
                collapsed
                    ? 'justify-center px-2 py-3'
                    : 'gap-3 px-4 py-3',

                isActive
                    ? 'bg-[#e8f3f3] text-slate-800 border border-[#d9e7e7]'
                    : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-700'
            ]"
        >
            <AppIcon
                :name="item.icon"
                class="w-5 h-5 shrink-0"
            />

            <span
                v-if="!collapsed"
                class="flex-1 text-left text-sm font-semibold"
            >
                {{ item.label }}
            </span>

            <AppIcon
                v-if="!collapsed"
                :name="open ? 'chevronDown' : 'chevronRight'"
                class="w-4 h-4 opacity-50"
            />
        </button>

        <!-- Children -->
        <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
        >
            <div
                v-if="open && !collapsed"
                class="mt-2 ml-5 pl-4 border-l border-slate-200 space-y-1"
            >
                <RouterLink
                    v-for="child in item.children"
                    :key="child.to"
                    :to="child.to"
                    class="block px-3 py-2 rounded-xl text-sm transition-all duration-150"
                    :class="
                        route.path === child.to
                            ? 'bg-slate-200/70 text-slate-800 font-semibold'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                    "
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
        class="flex items-center rounded-2xl transition-all duration-200"
        :class="[
            collapsed
                ? 'justify-center px-2 py-3'
                : 'gap-3 px-4 py-3',

            isActive
                ? 'bg-[#e8f3f3] text-slate-800 border border-[#d9e7e7] shadow-sm'
                : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-700'
        ]"
    >
        <AppIcon
            :name="item.icon"
            class="w-5 h-5 shrink-0"
        />

        <span
            v-if="!collapsed"
            class="text-sm font-semibold"
        >
            {{ item.label }}
        </span>
    </RouterLink>
</template>