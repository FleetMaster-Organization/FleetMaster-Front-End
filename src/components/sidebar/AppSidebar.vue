<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import { navByRole } from '@/composables/useNavigation'

import SidebarItem from '@/components/sidebar/SidebarItem.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

import logo from '@/assets/Logotipo.png'

const props = defineProps<{ collapsed: boolean }>()

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
        class="flex flex-col h-full bg-slate-50 border-r border-slate-200 transition-all duration-300 ease-in-out"
        :class="collapsed ? 'w-20' : 'w-[270px]'"
    >

        <!-- Logo section -->
        <div
            class="relative px-5 pt-6 pb-5 border-b border-slate-200"
        >
            <div class="flex items-start justify-between">

                <!-- Logo -->
                <div
                    class="flex flex-col items-center w-full"
                    :class="collapsed ? 'justify-center' : ''"
                >
                    <img
                        :src="logo"
                        alt="LogiFast"
                        class="transition-all duration-300 object-contain"
                        :class="collapsed ? 'w-10 h-10' : 'w-40'"
                    />

                    <Transition name="fade">
                        <div
                            v-if="!collapsed"
                            class="mt-3 text-center"
                        >
                            <p class="text-xs text-slate-400 font-medium tracking-wide">
                                Fleet Management System
                            </p>
                        </div>
                    </Transition>
                </div>
            </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 px-3 py-5 overflow-y-auto">

            <Transition name="fade">
                <p
                    v-if="!collapsed"
                    class="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-bold px-3 mb-4"
                >
                    Navegación
                </p>
            </Transition>

            <div class="space-y-2">
                <SidebarItem
                    v-for="item in navItems"
                    :key="item.label"
                    :item="item"
                    :collapsed="collapsed"
                />
            </div>
        </nav>

        <!-- Footer -->
        <div class="p-4 border-t border-slate-200">

            <div
                class="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm"
            >
                <div
                    class="flex items-center"
                    :class="collapsed ? 'justify-center' : 'gap-3'"
                >

                    <!-- Avatar -->
                    <div
                        class="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0 text-white font-bold shadow-md"
                    >
                        {{ auth.user?.name?.charAt(0) ?? 'U' }}
                    </div>

                    <!-- User info -->
                    <Transition name="fade">
                        <div
                            v-if="!collapsed"
                            class="flex-1 min-w-0"
                        >
                            <p class="text-sm font-semibold text-slate-800 truncate">
                                {{ auth.user?.name }}
                            </p>

                            <p class="text-xs text-slate-400 truncate">
                                {{ auth.user?.role }}
                            </p>
                        </div>
                    </Transition>

                    <!-- Logout -->
                    <button
                        v-if="!collapsed"
                        @click="logout"
                        class="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200"
                        title="Cerrar sesión"
                    >
                        <AppIcon
                            name="log-out"
                            class="w-4 h-4"
                        />
                    </button>
                </div>
            </div>
        </div>
    </aside>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>