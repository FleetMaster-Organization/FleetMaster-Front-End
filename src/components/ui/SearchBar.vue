<script setup lang="ts">
interface Props {
    modelValue: string
    placeholder?: string
}

withDefaults(defineProps<Props>(), {
    placeholder: 'Buscar...',
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
    <div class="relative">
        <svg
        class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
        >
        <path stroke-linecap="round" stroke-linejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
        </svg>
        <input
        type="text"
        :value="modelValue"
        :placeholder="placeholder"
        class="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl
                text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2
                focus:ring-blue-500/30 focus:border-blue-400 transition-all"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        />
    </div>
</template>