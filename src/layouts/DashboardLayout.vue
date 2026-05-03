<script setup lang="ts">
import { ref } from 'vue'
import AppSidebar from '@/components/sidebar/AppSidebar.vue'
import AppTopbar from '@/components/sidebar/AppTopbar.vue'

const collapsed = ref(false)
</script>

<template>
    <div class="flex h-screen bg-gray-50 overflow-hidden">
        <!-- Sidebar -->
        <AppSidebar :collapsed="collapsed" @toggle="collapsed = !collapsed" />

        <!-- Main area -->
        <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AppTopbar :sidebar-collapsed="collapsed" @toggle-sidebar="collapsed = !collapsed" />

        <!-- Page content -->
        <main class="flex-1 overflow-y-auto p-6">
            <RouterView />
        </main>
        </div>
    </div>
</template>