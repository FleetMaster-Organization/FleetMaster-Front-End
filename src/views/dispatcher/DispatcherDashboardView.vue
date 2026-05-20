<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useAssignmentsStore } from '@/stores/assignments'
import { useVehiclesStore } from '@/stores/vehicles'
import { useDriversStore } from '@/stores/drivers'
import { useAuthStore } from '@/stores/auth'
import DataTable from '@/components/ui/DataTable.vue'
import SearchBar from '@/components/ui/SearchBar.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import type { Assignment } from '@/types'

// ── Stores ────────────────────────────────────────────────────────────────
const assignmentsStore = useAssignmentsStore()
const vehiclesStore    = useVehiclesStore()
const driversStore     = useDriversStore()
const authStore        = useAuthStore()

const currentUser = computed(() => authStore.user?.email ?? 'dispatcher')

// ── Tabs ──────────────────────────────────────────────────────────────────
type Tab = 'activas' | 'historial'
const activeTab = ref<Tab>('activas')

// ── Búsqueda y filtrado ───────────────────────────────────────────────────
const search = ref('')

const PAGE_SIZE = 20
const currentPage = ref(1)

const baseList = computed(() =>
    activeTab.value === 'activas'
        ? assignmentsStore.activas
        : assignmentsStore.historial
)

const filtered = computed(() => {
    const q = search.value.toLowerCase().trim()
    if (!q) return baseList.value
    return baseList.value.filter(a =>
        a.vehiculoPlaca.toLowerCase().includes(q) ||
        a.conductorNombre.toLowerCase().includes(q) ||
        a.conductorCedula.includes(q)
    )
})

const totalPages = computed(() =>
    Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE))
)
const paginated = computed(() => {
    const start = (currentPage.value - 1) * PAGE_SIZE
    return filtered.value.slice(start, start + PAGE_SIZE)
})

// reset página al cambiar tab o búsqueda
function setTab(tab: Tab) {
    activeTab.value = tab
    currentPage.value = 1
    search.value = ''
}

// ── Modal cierre de asignación ────────────────────────────────────────────
const showCloseModal  = ref(false)
const closingAssign   = ref<Assignment | null>(null)
const closeError      = ref('')

const closeForm = reactive({
    fechaFin:      '',
    kilometrajeFin: 0,
})

function openCloseModal(row: Assignment) {
    closingAssign.value = row
    closeError.value    = ''

    // Valor mínimo sugerido = km del vehículo actual
    const vehicle = vehiclesStore.vehicles.find(v => v.id === row.vehiculoId)
    closeForm.kilometrajeFin = vehicle?.kilometraje ?? row.kilometrajeInicio

    // Fecha/hora actual como default
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    closeForm.fechaFin = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`

    showCloseModal.value = true
}

async function submitClose() {
    if (!closingAssign.value) return
    closeError.value = ''

    const result = await assignmentsStore.closeAssignment(closingAssign.value.id, {
        fechaFin:      closeForm.fechaFin,
        kilometrajeFin: Number(closeForm.kilometrajeFin),
    })

    if (result.success) {
        showCloseModal.value = false
        closingAssign.value  = null
    } else {
        closeError.value = result.error ?? 'No se pudo registrar la devolución.'
    }
}

// ── Helpers UI ────────────────────────────────────────────────────────────
function fmtDate(iso: string | null) {
    if (!iso) return '—'
    return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso))
}

function fmtKm(km: number | null) {
    if (km === null) return '—'
    return new Intl.NumberFormat('es-CO').format(km) + ' km'
}

// ── Columnas tabla ────────────────────────────────────────────────────────
const columnsActivas = [
    { key: 'vehiculoPlaca',   label: 'Placa',        width: '110px' },
    { key: 'vehiculoInfo',    label: 'Vehículo'      },
    { key: 'conductorNombre', label: 'Conductor'     },
    { key: 'conductorCedula', label: 'Cédula',       width: '130px' },
    { key: 'fechaInicio',     label: 'Inicio',       width: '160px' },
    { key: 'kmInicio',        label: 'Km salida',    width: '110px', align: 'right' as const },
    { key: 'acciones',        label: '',             width: '140px', align: 'center' as const },
]

const columnsHistorial = [
    { key: 'vehiculoPlaca',   label: 'Placa',        width: '110px' },
    { key: 'vehiculoInfo',    label: 'Vehículo'      },
    { key: 'conductorNombre', label: 'Conductor'     },
    { key: 'fechaInicio',     label: 'Salida',       width: '160px' },
    { key: 'fechaFin',        label: 'Llegada',      width: '160px' },
    { key: 'kmInicio',        label: 'Km salida',    width: '110px', align: 'right' as const },
    { key: 'kmFin',           label: 'Km llegada',   width: '110px', align: 'right' as const },
    { key: 'estado',          label: 'Estado',       width: '110px', align: 'center' as const },
]

// ── Stats rápidas ─────────────────────────────────────────────────────────
const statsCards = computed(() => [
    {
        label: 'Vehículos en ruta',
        value: vehiclesStore.inRouteVehicles,
        color: 'blue',
        icon: 'M8 17l4 4 4-4m-4-5v9M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29',
    },
    {
        label: 'Asignaciones activas',
        value: assignmentsStore.activas.length,
        color: 'emerald',
        icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
        label: 'Completadas hoy',
        value: (() => {
        const hoy = new Date().toISOString().slice(0, 10)
        return assignmentsStore.historial.filter(
            a => a.fechaFin?.startsWith(hoy)
        ).length
        })(),
        color: 'slate',
        icon: 'M5 13l4 4L19 7',
    },
    {
        label: 'Conductores disponibles',
        value: driversStore.availableDrivers.length,
        color: 'amber',
        icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    },
])

const colorMap: Record<string, string> = {
    blue:    'bg-blue-50 text-blue-700 border border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    slate:   'bg-slate-100 text-slate-700 border border-slate-200',
    amber:   'bg-amber-50 text-amber-700 border border-amber-100',
}
const iconBgMap: Record<string, string> = {
    blue:    'bg-blue-100 text-blue-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    slate:   'bg-slate-200 text-slate-600',
    amber:   'bg-amber-100 text-amber-600',
}

// ── km mínimo para validación inline ─────────────────────────────────────
const minKm = computed(() => {
    if (!closingAssign.value) return 0
    const v = vehiclesStore.vehicles.find(v => v.id === closingAssign.value!.vehiculoId)
    return v?.kilometraje ?? closingAssign.value.kilometrajeInicio
})
</script>

<template>
    <div class="p-6 space-y-6">

        <!-- ── Header ───────────────────────────────────────────────────── -->
        <div class="flex items-start justify-between">
        <div>
            <h1 class="text-2xl font-bold text-slate-800">Control de Despacho</h1>
            <p class="text-slate-400 text-sm mt-0.5">
            Registra devoluciones y consulta el historial de asignaciones
            </p>
        </div>
        <!-- badge de rol -->
        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold">
            <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            Despachador
        </span>
        </div>

        <!-- ── Stat cards ────────────────────────────────────────────────── -->
        <div class="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div
            v-for="card in statsCards"
            :key="card.label"
            :class="['rounded-xl p-4 flex items-center gap-3', colorMap[card.color]]"
        >
            <div :class="['w-10 h-10 rounded-lg flex items-center justify-center shrink-0', iconBgMap[card.color]]">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" :d="card.icon" />
            </svg>
            </div>
            <div>
            <p class="text-2xl font-bold leading-none">{{ card.value }}</p>
            <p class="text-xs mt-0.5 opacity-70">{{ card.label }}</p>
            </div>
        </div>
        </div>

        <!-- ── Tabs ─────────────────────────────────────────────────────── -->
        <div class="flex items-center gap-3">
        <div class="bg-slate-100 p-1 rounded-xl flex gap-1">
            <button
            v-for="tab in (['activas', 'historial'] as Tab[])"
            :key="tab"
            @click="setTab(tab)"
            :class="[
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize flex items-center gap-2',
                activeTab === tab
                ? 'bg-white shadow-sm text-slate-800'
                : 'text-slate-500 hover:text-slate-700',
            ]"
            >
            {{ tab === 'activas' ? 'En ruta' : 'Historial' }}
            <span
                :class="[
                'text-xs font-bold px-1.5 py-0.5 rounded-full',
                activeTab === tab ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-600',
                ]"
            >
                {{ tab === 'activas' ? assignmentsStore.activas.length : assignmentsStore.historial.length }}
            </span>
            </button>
        </div>
        </div>

        <!-- ── Buscador ──────────────────────────────────────────────────── -->
        <SearchBar
        v-model="search"
        placeholder="Buscar por placa, conductor o cédula…"
        class="max-w-sm"
        />

        <!-- ── Tabla asignaciones ACTIVAS ───────────────────────────────── -->
        <div v-if="activeTab === 'activas'" class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <DataTable
            :columns="columnsActivas"
            :rows="paginated"
            row-key="id"
            :empty-message="search ? 'Sin resultados para la búsqueda.' : 'No hay vehículos en ruta actualmente.'"
        >
            <!-- Placa -->
            <template #cell-vehiculoPlaca="{ row }">
            <span class="font-mono font-bold text-xs tracking-widest text-slate-800">
                {{ (row as Assignment).vehiculoPlaca }}
            </span>
            </template>

            <!-- Vehículo info -->
            <template #cell-vehiculoInfo="{ row }">
            <span class="text-sm text-slate-700">
                {{ (row as Assignment).vehiculoMarca }} {{ (row as Assignment).vehiculoModelo }}
            </span>
            </template>

            <!-- Conductor -->
            <template #cell-conductorNombre="{ row }">
            <div>
                <p class="text-sm text-slate-800 font-medium">{{ (row as Assignment).conductorNombre }}</p>
            </div>
            </template>

            <!-- Cédula -->
            <template #cell-conductorCedula="{ row }">
            <span class="font-mono text-xs text-slate-600">{{ (row as Assignment).conductorCedula }}</span>
            </template>

            <!-- Fecha inicio -->
            <template #cell-fechaInicio="{ row }">
            <span class="text-xs text-slate-500">{{ fmtDate((row as Assignment).fechaInicio) }}</span>
            </template>

            <!-- Km salida -->
            <template #cell-kmInicio="{ row }">
            <span class="font-mono text-xs text-slate-600">{{ fmtKm((row as Assignment).kilometrajeInicio) }}</span>
            </template>

            <!-- Acción -->
            <template #cell-acciones="{ row }">
            <button
                @click="openCloseModal(row as Assignment)"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Registrar llegada
            </button>
            </template>

            <!-- Paginación -->
            <template #pagination>
            <div v-if="totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <span class="text-xs text-slate-400">
                Página {{ currentPage }} de {{ totalPages }} · {{ filtered.length }} registros
                </span>
                <div class="flex gap-2">
                <button
                    :disabled="currentPage === 1"
                    @click="currentPage--"
                    class="px-3 py-1 text-xs rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                    Anterior
                </button>
                <button
                    :disabled="currentPage === totalPages"
                    @click="currentPage++"
                    class="px-3 py-1 text-xs rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                    Siguiente
                </button>
                </div>
            </div>
            </template>
        </DataTable>
        </div>

        <!-- ── Tabla HISTORIAL ───────────────────────────────────────────── -->
        <div v-if="activeTab === 'historial'" class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <DataTable
            :columns="columnsHistorial"
            :rows="paginated"
            row-key="id"
            :empty-message="search ? 'Sin resultados para la búsqueda.' : 'No hay registros históricos aún.'"
        >
            <template #cell-vehiculoPlaca="{ row }">
            <span class="font-mono font-bold text-xs tracking-widest text-slate-800">
                {{ (row as Assignment).vehiculoPlaca }}
            </span>
            </template>

            <template #cell-vehiculoInfo="{ row }">
            <span class="text-sm text-slate-700">
                {{ (row as Assignment).vehiculoMarca }} {{ (row as Assignment).vehiculoModelo }}
            </span>
            </template>

            <template #cell-conductorNombre="{ row }">
            <p class="text-sm text-slate-800">{{ (row as Assignment).conductorNombre }}</p>
            </template>

            <template #cell-fechaInicio="{ row }">
            <span class="text-xs text-slate-500">{{ fmtDate((row as Assignment).fechaInicio) }}</span>
            </template>

            <template #cell-fechaFin="{ row }">
            <span class="text-xs text-slate-500">{{ fmtDate((row as Assignment).fechaFin) }}</span>
            </template>

            <template #cell-kmInicio="{ row }">
            <span class="font-mono text-xs text-slate-600">{{ fmtKm((row as Assignment).kilometrajeInicio) }}</span>
            </template>

            <template #cell-kmFin="{ row }">
            <span class="font-mono text-xs text-slate-600">{{ fmtKm((row as Assignment).kilometrajeFin) }}</span>
            </template>

            <template #cell-estado="{ row }">
            <StatusBadge :status="(row as Assignment).estado" />
            </template>

            <template #pagination>
            <div v-if="totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <span class="text-xs text-slate-400">
                Página {{ currentPage }} de {{ totalPages }} · {{ filtered.length }} registros
                </span>
                <div class="flex gap-2">
                <button
                    :disabled="currentPage === 1"
                    @click="currentPage--"
                    class="px-3 py-1 text-xs rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                    Anterior
                </button>
                <button
                    :disabled="currentPage === totalPages"
                    @click="currentPage++"
                    class="px-3 py-1 text-xs rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                    Siguiente
                </button>
                </div>
            </div>
            </template>
        </DataTable>
        </div>

    </div>

    <!-- ── Modal: Registrar devolución ──────────────────────────────────── -->
    <BaseModal
        :show="showCloseModal"
        title="Registrar llegada / devolución"
        size="md"
        @close="showCloseModal = false"
    >
        <div v-if="closingAssign" class="space-y-5">

        <!-- Info de la asignación -->
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round"
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Detalles de la asignación</span>
            </div>
            <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
                <p class="text-xs text-slate-400 font-semibold">Vehículo</p>
                <p class="font-mono font-bold text-slate-800 tracking-widest text-xs mt-0.5">
                {{ closingAssign.vehiculoPlaca }}
                </p>
                <p class="text-xs text-slate-500">{{ closingAssign.vehiculoMarca }} {{ closingAssign.vehiculoModelo }}</p>
            </div>
            <div>
                <p class="text-xs text-slate-400 font-semibold">Conductor</p>
                <p class="text-xs text-slate-800 font-medium mt-0.5">{{ closingAssign.conductorNombre }}</p>
                <p class="font-mono text-xs text-slate-500">C.C. {{ closingAssign.conductorCedula }}</p>
            </div>
            <div>
                <p class="text-xs text-slate-400 font-semibold">Salida</p>
                <p class="text-xs text-slate-600 mt-0.5">{{ fmtDate(closingAssign.fechaInicio) }}</p>
            </div>
            <div>
                <p class="text-xs text-slate-400 font-semibold">Km al salir</p>
                <p class="font-mono text-xs text-slate-600 mt-0.5">{{ fmtKm(closingAssign.kilometrajeInicio) }}</p>
            </div>
            </div>
        </div>

        <!-- Formulario -->
        <div class="space-y-4">
            <!-- Fecha/hora de llegada -->
            <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                Fecha y hora de llegada <span class="text-red-500">*</span>
            </label>
            <input
                v-model="closeForm.fechaFin"
                type="datetime-local"
                class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition"
            />
            </div>

            <!-- Kilometraje final -->
            <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                Kilometraje al llegar <span class="text-red-500">*</span>
            </label>
            <input
                v-model.number="closeForm.kilometrajeFin"
                type="number"
                :min="minKm"
                class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-800 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition"
                placeholder="Km registrado en el odómetro"
            />
            <p class="text-xs text-slate-400 mt-1">
                Mínimo aceptado:
                <span class="font-mono font-semibold text-slate-600">{{ fmtKm(minKm) }}</span>
            </p>
            <!-- Advertencia km menor -->
            <div
                v-if="closeForm.kilometrajeFin > 0 && closeForm.kilometrajeFin < minKm"
                class="bg-red-50 border border-red-200 rounded-lg p-2.5 mt-2 text-xs text-red-700"
            >
                El kilometraje final no puede ser menor al kilometraje actual del vehículo.
            </div>
            <!-- Recorrido calculado -->
            <div
                v-else-if="closeForm.kilometrajeFin >= minKm && closeForm.kilometrajeFin > 0"
                class="text-xs text-emerald-600 mt-1 font-medium"
            >
                Recorrido de esta ruta:
                {{ new Intl.NumberFormat('es-CO').format(closeForm.kilometrajeFin - closingAssign.kilometrajeInicio) }} km
            </div>
            </div>

            <!-- Error global -->
            <div
            v-if="closeError"
            class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700"
            >
            {{ closeError }}
            </div>
        </div>
        </div>

        <template #footer>
        <div class="flex justify-end gap-3">
            <button
            @click="showCloseModal = false"
            class="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
            Cancelar
            </button>
            <button
            @click="submitClose"
            :disabled="!closeForm.fechaFin || closeForm.kilometrajeFin < minKm"
            class="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
            >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Confirmar llegada
            </button>
        </div>
        </template>
    </BaseModal>
</template>