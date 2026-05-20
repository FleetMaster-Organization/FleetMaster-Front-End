<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAlertsStore } from '@/stores/alerts'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import SearchBar   from '@/components/ui/SearchBar.vue'
import DataTable   from '@/components/ui/DataTable.vue'
import type { SystemAlert } from '@/types'

const alertsStore = useAlertsStore()

const activeTab = ref<'pendientes' | 'gestionadas'>('pendientes')
const search    = ref('')

function matchSearch(a: SystemAlert) {
    if (!search.value.trim()) return true
    const q = search.value.toLowerCase()
    return a.entidadNombre.toLowerCase().includes(q) || a.tipo.toLowerCase().includes(q)
}

const filteredPendientes  = computed(() => alertsStore.pendientes.filter(matchSearch))
const filteredGestionadas = computed(() => alertsStore.gestionadas.filter(matchSearch))

const columns = [
    { key: 'tipo',           label: 'Documento', width: '180px' },
    { key: 'entidadNombre',  label: 'Entidad' },
    { key: 'entidadTipo',    label: 'Tipo', width: '100px' },
    { key: 'severidad',      label: 'Severidad', width: '120px' },
    { key: 'fechaVencimiento', label: 'Vence', width: '115px' },
    { key: 'diasRestantes',  label: 'Días', width: '80px', align: 'center' as const },
    { key: 'actions',        label: 'Acciones', width: '130px', align: 'center' as const },
]

const columnsGestionadas = [
    { key: 'tipo',           label: 'Documento', width: '180px' },
    { key: 'entidadNombre',  label: 'Entidad' },
    { key: 'severidad',      label: 'Severidad', width: '120px' },
    { key: 'fechaVencimiento', label: 'Vence', width: '115px' },
    { key: 'gestionadaEn',   label: 'Gestionada el', width: '150px' },
    { key: 'gestionadaPor',  label: 'Por', width: '120px' },
]

function fmtDate(iso: string | null): string {
    if (!iso) return '—'
    return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(new Date(iso + 'T12:00:00'))
}

function fmtDateTime(iso: string | null): string {
    if (!iso) return '—'
    return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso))
}

function diasLabel(dias: number): string {
    if (dias < 0) return `${Math.abs(dias)}d vencido`
    if (dias === 0) return 'Hoy'
    return `${dias}d`
}

function diasClass(dias: number): string {
    if (dias < 0) return 'text-red-700 font-bold'
    if (dias <= 10) return 'text-red-600 font-semibold'
    return 'text-amber-700 font-medium'
}

function markManaged(id: string) {
    alertsStore.markManaged(id, 'Administrador')
}
</script>

<template>
    <div class="p-6 space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
        <div>
            <h1 class="text-2xl font-bold text-slate-800">Alertas</h1>
            <p class="text-sm text-slate-500 mt-0.5">
            <span class="text-red-600 font-medium">{{ alertsStore.criticas.length }} vencidas</span> ·
            <span class="text-amber-600 font-medium">{{ alertsStore.advertencias.length }} por vencer</span> ·
            {{ alertsStore.gestionadas.length }} gestionadas
            </p>
        </div>
        </div>

        <!-- Banners de resumen (REQ-36) -->
        <div class="grid grid-cols-3 gap-4">
        <div class="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <div class="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
            </svg>
            </div>
            <div>
            <p class="text-2xl font-bold text-red-700">{{ alertsStore.criticas.length }}</p>
            <p class="text-xs text-red-600">Documentos vencidos</p>
            </div>
        </div>

        <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            </div>
            <div>
            <p class="text-2xl font-bold text-amber-700">{{ alertsStore.advertencias.length }}</p>
            <p class="text-xs text-amber-600">Vencen en ≤ 30 días</p>
            </div>
        </div>

        <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <div class="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            </div>
            <div>
            <p class="text-2xl font-bold text-slate-600">{{ alertsStore.gestionadas.length }}</p>
            <p class="text-xs text-slate-500">Gestionadas</p>
            </div>
        </div>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
            v-for="tab in [
            { key: 'pendientes',  label: 'Pendientes',  count: alertsStore.pendientes.length },
            { key: 'gestionadas', label: 'Gestionadas', count: alertsStore.gestionadas.length },
            ]"
            :key="tab.key"
            :class="[
            'px-5 py-2 text-sm font-medium rounded-lg transition-all',
            activeTab === tab.key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            ]"
            @click="activeTab = tab.key as 'pendientes' | 'gestionadas'"
        >
            {{ tab.label }}
            <span :class="['ml-2 text-xs px-1.5 py-0.5 rounded-full',
            activeTab === tab.key
                ? (tab.key === 'pendientes' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600')
                : 'bg-slate-200 text-slate-500']">
            {{ tab.count }}
            </span>
        </button>
        </div>

        <!-- Búsqueda -->
        <div class="max-w-sm">
        <SearchBar v-model="search" placeholder="Buscar por entidad o documento..." />
        </div>

        <!-- Tabla Pendientes -->
        <DataTable
        v-if="activeTab === 'pendientes'"
        :columns="columns"
        :rows="filteredPendientes as unknown as Record<string, unknown>[]"
        row-key="id"
        empty-message="No hay alertas pendientes. ¡Todo en orden!"
        >
        <template #cell-tipo="{ row }">
            <span class="text-sm font-medium text-slate-700">{{ (row as unknown as SystemAlert).tipo }}</span>
        </template>

        <template #cell-entidadNombre="{ row }">
            <div>
            <span :class="[
                'font-semibold text-sm',
                (row as unknown as SystemAlert).entidadTipo === 'vehiculo'
                ? 'font-mono tracking-widest text-slate-800'
                : 'text-slate-800',
            ]">
                {{ (row as unknown as SystemAlert).entidadNombre }}
            </span>
            </div>
        </template>

        <template #cell-entidadTipo="{ row }">
            <span class="text-xs text-slate-500 capitalize">
            {{ (row as unknown as SystemAlert).entidadTipo === 'vehiculo' ? '🚛 Vehículo' : '👤 Conductor' }}
            </span>
        </template>

        <template #cell-severidad="{ row }">
            <StatusBadge :status="(row as unknown as SystemAlert).severidad" />
        </template>

        <template #cell-fechaVencimiento="{ row }">
            <span class="text-xs text-slate-600">{{ fmtDate((row as unknown as SystemAlert).fechaVencimiento) }}</span>
        </template>

        <template #cell-diasRestantes="{ row }">
            <span :class="['text-xs', diasClass((row as unknown as SystemAlert).diasRestantes)]">
            {{ diasLabel((row as unknown as SystemAlert).diasRestantes) }}
            </span>
        </template>

        <template #cell-actions="{ row }">
            <div class="flex justify-center">
            <button
                class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-50
                    text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                @click="markManaged((row as unknown as SystemAlert).id)"
            >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
                Gestionar
            </button>
            </div>
        </template>
        </DataTable>

        <!-- Tabla Gestionadas -->
        <DataTable
        v-if="activeTab === 'gestionadas'"
        :columns="columnsGestionadas"
        :rows="filteredGestionadas as unknown as Record<string, unknown>[]"
        row-key="id"
        empty-message="No hay alertas gestionadas."
        >
        <template #cell-tipo="{ row }">
            <span class="text-sm font-medium text-slate-700">{{ (row as unknown as SystemAlert).tipo }}</span>
        </template>

        <template #cell-entidadNombre="{ row }">
            <span :class="[
            'font-semibold text-sm text-slate-600',
            (row as unknown as SystemAlert).entidadTipo === 'vehiculo' ? 'font-mono tracking-widest' : '',
            ]">
            {{ (row as unknown as SystemAlert).entidadNombre }}
            </span>
        </template>

        <template #cell-severidad="{ row }">
            <StatusBadge :status="(row as unknown as SystemAlert).severidad" />
        </template>

        <template #cell-fechaVencimiento="{ row }">
            <span class="text-xs text-slate-500">{{ fmtDate((row as unknown as SystemAlert).fechaVencimiento) }}</span>
        </template>

        <template #cell-gestionadaEn="{ row }">
            <span class="text-xs text-slate-500">{{ fmtDateTime((row as unknown as SystemAlert).gestionadaEn) }}</span>
        </template>

        <template #cell-gestionadaPor="{ row }">
            <span class="text-xs text-slate-600">{{ (row as unknown as SystemAlert).gestionadaPor ?? '—' }}</span>
        </template>
        </DataTable>
    </div>
</template>