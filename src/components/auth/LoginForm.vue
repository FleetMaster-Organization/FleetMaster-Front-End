<script setup>
import { ref } from 'vue'

const username = ref('')
const password = ref('')
const showPassword = ref(false)
</script>

<template>
    <div
        class="bg-white rounded-2xl overflow-hidden"
        style="box-shadow: 0 4px 6px -1px rgba(0,0,0,0.07), 0 12px 40px -4px rgba(0,0,0,0.13), 0 0 0 1px rgba(0,0,0,0.05);"
    >
        <div class="p-8">

        <!-- Header -->
        <div class="mb-7">
            <h2 class="text-xl font-semibold text-gray-900">Autenticación del sistema</h2>
            <p class="text-gray-400 text-sm mt-1">Accede a tu panel operativo</p>
        </div>

        <form class="space-y-5" @submit.prevent>

            <!-- Usuario -->
            <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Usuario / Identificador
            </label>
            <div class="relative">
                <span class="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/>
                </svg>
                </span>
                <input
                v-model="username"
                type="text"
                placeholder="Ingresa tu ID"
                class="w-full h-11 pl-9 pr-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700
                        placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent transition"
                />
            </div>
            </div>

            <!-- Contraseña -->
            <div>
            <div class="flex justify-between items-center mb-1.5">
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Contraseña
                </label>
                <button type="button" class="text-xs font-medium hover:underline" style="color: #1a5fa8;">
                ¿Olvidaste tu contraseña?
                </button>
            </div>
            <div class="relative">
                <span class="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"/>
                </svg>
                </span>
                <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                class="w-full h-11 pl-9 pr-10 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700
                        focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent transition"
                />
                <button
                type="button"
                class="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                @click="showPassword = !showPassword"
                >
                <!-- Ojo abierto -->
                <svg v-if="!showPassword" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                </svg>
                <!-- Ojo cerrado -->
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"/>
                </svg>
                </button>
            </div>
            </div>

            <!-- Botón -->
            <button
            type="submit"
            class="w-full h-11 rounded-xl text-white text-sm font-semibold tracking-wide
                    transition-all duration-200 hover:brightness-110 active:scale-[0.98] mt-1"
            style="background-color: #1a3a5c;"
            >
            Iniciar sesión en FleetMaster &nbsp;→
            </button>

        </form>
        </div>

        <!-- Footer -->
        <div
        class="px-8 py-4 text-center text-sm text-gray-400"
        style="background-color: #f3f4f6; border-top: 1px solid #e5e7eb;"
        >
        Personal autorizado únicamente.
        <a href="#" class="font-semibold hover:underline ml-1" style="color: #1a3a5c;">
            Solicitar acceso
        </a>
        </div>

    </div>
</template>