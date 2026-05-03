<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { navByRole } from '@/composables/useNavigation'
import SidebarItem from '@/components/sidebar/SidebarItem.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const props = defineProps<{ collapsed: boolean }>()
const emit = defineEmits<{ (e: 'toggle'): void }>()

const auth = useAuthStore()
const router = useRouter()

const navItems = computed(() =>
    auth.userRole ? navByRole[auth.userRole] : []
)

function logout() {
    auth.logout()
    router.push('/login')
}
</script>

<template>
    <aside
        class="flex flex-col h-full bg-[#0f172a] transition-all duration-300 ease-in-out"
        :class="collapsed ? 'w-16' : 'w-64'"
    >
        <!-- Logo -->
        <div class="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <span class="text-white font-bold text-sm">LF</span>
        </div>
        <Transition name="fade">
            <span v-if="!collapsed" class="text-white font-bold text-lg tracking-tight">LogiFast</span>
        </Transition>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p v-if="!collapsed" class="text-xs font-semibold text-slate-500 uppercase tracking-widest px-3 mb-3">
            Menú
        </p>
        <SidebarItem
            v-for="item in navItems"
            :key="item.label"
            :item="item"
            :collapsed="collapsed"
        />
        </nav>

        <!-- User footer -->
        <div class="px-3 pb-4 border-t border-white/10 pt-4">
        <div class="flex items-center gap-3 px-3 py-2">
            <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 text-white text-sm font-bold">
            {{ auth.user?.name?.charAt(0) ?? 'U' }}
            </div>
            <Transition name="fade">
            <div v-if="!collapsed" class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-white truncate">{{ auth.user?.name }}</p>
                <p class="text-xs text-slate-400 capitalize">{{ auth.user?.role }}</p>
            </div>
            </Transition>
            <button
            v-if="!collapsed"
            @click="logout"
            class="text-slate-400 hover:text-white transition-colors"
            title="Cerrar sesión"
            >
            <AppIcon name="log-out" class="w-4 h-4" />
            </button>
        </div>
        </div>
    </aside>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>