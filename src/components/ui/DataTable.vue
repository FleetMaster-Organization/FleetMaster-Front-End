<script setup lang="ts" generic="T">
interface Column {
    key: string
    label: string
    width?: string
    align?: 'left' | 'center' | 'right'
}

interface Props {
    columns: Column[]
    rows: T[]
    rowKey?: string
    loading?: boolean
    emptyMessage?: string
}

withDefaults(defineProps<Props>(), {
    rowKey: 'id',
    loading: false,
    emptyMessage: 'No hay registros para mostrar.',
})

const alignClass = (align?: string) => {
    if (align === 'center') return 'text-center'
    if (align === 'right')  return 'text-right'
    return 'text-left'
}
</script>

<template>
    <div class="rounded-xl border border-slate-200 bg-white">
        <div class="overflow-x-auto rounded-xl">
            <table class="w-full text-sm">
                <thead>
                    <tr class="bg-slate-50 border-b border-slate-200">
                        <th
                            v-for="col in columns"
                            :key="col.key"
                            :style="col.width ? `width: ${col.width}` : ''"
                            :class="[
                                'px-4 py-3 font-semibold text-slate-600 uppercase tracking-wider text-xs',
                                alignClass(col.align),
                            ]"
                        >
                            {{ col.label }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <!-- Loading skeleton -->
                    <template v-if="loading">
                        <tr v-for="i in 5" :key="i" class="border-b border-slate-100">
                            <td v-for="col in columns" :key="col.key" class="px-4 py-3">
                                <div class="h-4 bg-slate-100 rounded animate-pulse" />
                            </td>
                        </tr>
                    </template>

                    <!-- Empty state -->
                    <template v-else-if="rows.length === 0">
                        <tr>
                            <td :colspan="columns.length" class="px-4 py-12 text-center text-slate-400">
                                <svg class="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                                    />
                                </svg>
                                <p class="text-sm">{{ emptyMessage }}</p>
                            </td>
                        </tr>
                    </template>

                    <!-- Data rows -->
                    <template v-else>
                        <tr
                            v-for="row in rows"
                            :key="String((row as Record<string, unknown>)[rowKey])"
                            class="border-b border-slate-100 hover:bg-slate-50/70 transition-colors"
                        >
                            <td
                                v-for="col in columns"
                                :key="col.key"
                                :class="['px-4 py-3 text-slate-700', alignClass(col.align)]"
                            >
                                <!--
                                    row → tipo T (el tipo real: SystemAlert, Vehicle, etc.)
                                    value → unknown (acceso por string key, TypeScript no puede inferirlo)
                                    En los slots usa siempre `row.campo` directamente.
                                    Usa `value` solo cuando hagas tu propio cast: `value as string`.
                                -->
                                <slot :name="`cell-${col.key}`" :row="row" :value="(row as Record<string, unknown>)[col.key]">
                                    {{ (row as Record<string, unknown>)[col.key] ?? '—' }}
                                </slot>
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>

        <!-- Pagination slot -->
        <div v-if="$slots.pagination" class="px-4 py-3 border-t border-slate-100 bg-slate-50">
            <slot name="pagination" />
        </div>
    </div>
</template>