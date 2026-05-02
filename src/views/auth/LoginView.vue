<script setup>
import AuthLayout from '@/layouts/AuthLayout.vue'
import LoginForm from '@/components/auth/LoginForm.vue'
</script>

<template>
    <AuthLayout>

        <!-- Logo -->
        <div class="flex flex-col items-center mb-8">
        <div class="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-md" style="background-color: #1a3a5c;">
            <svg class="w-7 h-7 text-white" fill="none" stroke="white" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"/>
            </svg>
        </div>

        <h1 class="text-2xl font-bold tracking-tight" style="color: #1a3a5c;">
            FleetMaster
        </h1>
        <p class="text-xs text-gray-400 uppercase tracking-widest mt-0.5">
            Control logístico empresarial
        </p>
        </div>

        <!-- Formulario -->
        <LoginForm />

        <!-- Estado del sistema -->
        <div class="flex items-center justify-center gap-4 mt-5 text-xs text-gray-400">
        <span class="flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
            Fleet Core: Operacional
        </span>
        <span>v4.2.1-Stable</span>
        <a href="#" class="hover:text-gray-600">Soporte</a>
        </div>

    </AuthLayout>
</template>