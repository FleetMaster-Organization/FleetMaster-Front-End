<script setup lang="ts">
defineProps<{ message?: string }>()
</script>

<template>
    <div class="flex flex-col items-center justify-center min-h-[320px] gap-5">
        <div class="relative w-14 h-14">
            <div class="absolute inset-0 rounded-full border-[3px] border-slate-200" />
            <div class="absolute inset-0 rounded-full border-[3px] border-[#00355f] border-t-transparent animate-spin" />
            <div class="absolute inset-2 rounded-full border-[3px] border-blue-200 border-b-transparent animate-spin [animation-duration:0.7s] [animation-direction:reverse]" />
        </div>
        <p class="text-sm font-medium text-slate-500 animate-pulse">{{ message ?? 'Cargando datos...' }}</p>
    </div>
</template>
