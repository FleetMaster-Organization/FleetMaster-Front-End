<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

interface Props {
    show: boolean
    title: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
}

const props = withDefaults(defineProps<Props>(), { size: 'md' })
const emit = defineEmits<{ close: [] }>()

const sizeClasses: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
}

function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
</script>

<template>
    <Teleport to="body">
        <Transition name="modal">
        <div
            v-if="show"
            class="fixed inset-0 z-50 flex items-center justify-center p-4"
            @click.self="emit('close')"
        >
            <!-- Backdrop -->
            <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

            <!-- Panel -->
            <div
            :class="[
                'relative bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[90vh]',
                sizeClasses[size],
            ]"
            >
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <h2 class="text-lg font-semibold text-slate-800">{{ title }}</h2>
                <button
                class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                @click="emit('close')"
                >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                </button>
            </div>

            <!-- Body (scrollable) -->
            <div class="overflow-y-auto flex-1 px-6 py-4">
                <slot />
            </div>

            <!-- Footer -->
            <div v-if="$slots.footer" class="px-6 py-4 border-t border-slate-100 shrink-0">
                <slot name="footer" />
            </div>
            </div>
        </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}
.modal-enter-active .relative,
.modal-leave-active .relative {
    transition: transform 0.2s ease, opacity 0.2s ease;
}
.modal-enter-from .relative,
.modal-leave-to .relative {
    transform: scale(0.95) translateY(-8px);
    opacity: 0;
}
</style>