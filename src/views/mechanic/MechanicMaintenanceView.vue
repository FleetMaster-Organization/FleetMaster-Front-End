<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'

import SearchBar from '@/components/ui/SearchBar.vue'
import DataTable from '@/components/ui/DataTable.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

import { useMaintenanceStore } from '@/stores/maintenance'
import { useVehiclesStore } from '@/stores/vehicles'
import { useAuthStore } from '@/stores/auth'

import type { DataTableCellSlotProps } from '@/types/data-table'

import type {
    MaintenanceRecord,
    MaintenanceFormData,
    MaintenanceCloseData,
    MaintenanceType,
} from '@/types'

// ─── Stores ─────────────────────────────────────────────────────
const maintenanceStore = useMaintenanceStore()
const vehiclesStore    = useVehiclesStore()
const authStore        = useAuthStore()

onMounted(() => {
    if (vehiclesStore.vehicles.length === 0) {
        void vehiclesStore.loadVehicles()
    }
})

// ─── Search ─────────────────────────────────────────────────────
const search = ref('')

const filteredItems = computed<MaintenanceRecord[]>(() => {
    const q = search.value.trim().toLowerCase()
    if (!q) return maintenanceStore.abiertos

    return maintenanceStore.abiertos.filter(r =>
        r.vehiculoPlaca.toLowerCase().includes(q) ||
        r.vehiculoMarca.toLowerCase().includes(q) ||
        r.vehiculoModelo.toLowerCase().includes(q) ||
        r.tecnico.toLowerCase().includes(q) ||
        r.tipo.toLowerCase().includes(q) ||
        r.descripcion.toLowerCase().includes(q)
    )
})

// ─── Pagination ─────────────────────────────────────────────────
const PAGE_SIZE   = 20
const currentPage = ref(1)

watch(search, () => { currentPage.value = 1 })

const totalPages = computed(() =>
    Math.max(1, Math.ceil(filteredItems.value.length / PAGE_SIZE))
)

const paginatedItems = computed(() => {
    const start = (currentPage.value - 1) * PAGE_SIZE
    return filteredItems.value.slice(start, start + PAGE_SIZE)
})

/** Filas tipadas para DataTable (T extends Record<string, unknown>) */
const tableRows = computed(
    () => paginatedItems.value as unknown as Record<string, unknown>[]
)

// ─── Table columns ──────────────────────────────────────────────
const columns = [
    { key: 'vehiculo',     label: 'Vehículo' },
    { key: 'tipo',         label: 'Tipo',          width: '120px' },
    { key: 'tecnico',      label: 'Técnico' },
    { key: 'fechaIngreso', label: 'Fecha ingreso', width: '130px' },
    { key: 'estado',       label: 'Estado',        width: '120px' },
    { key: 'costo',        label: 'Costo',         align: 'right' as const, width: '130px' },
    { key: 'acciones',     label: '',              width: '100px', align: 'right' as const },
]

// ─── Helpers ─────────────────────────────────────────────────────
function asRecord(row: DataTableCellSlotProps['row']): MaintenanceRecord {
    return row as unknown as MaintenanceRecord
}

function todayISO(): string {
    return new Date().toISOString().split('T')[0]!
}

function formatDate(iso: string | null): string {
    if (!iso) return '—'
    return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(new Date(iso))
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', minimumFractionDigits: 0,
    }).format(value)
}

const maintenanceTypes: MaintenanceType[] = ['Preventivo', 'Correctivo', 'Revisión']

/** Vehículos elegibles para nuevo mantenimiento */
const eligibleVehicles = computed(() =>
    vehiclesStore.vehicles.filter(v =>
        v.estadoAdministrativo !== 'Vendido' &&
        v.estadoOperativo !== 'En ruta' &&
        !maintenanceStore.abiertos.some(r => r.vehiculoId === v.id)
    )
)

// ─── Modal: abrir mantenimiento ──────────────────────────────────
const showCreateModal = ref(false)
const formError       = ref('')

const openForm = reactive<MaintenanceFormData>({
    vehiculoId:   '',
    tipo:         'Preventivo',
    descripcion:  '',
    fechaIngreso: todayISO(),
    costo:        0,
    tecnico:      '',
})

function resetOpenForm() {
    openForm.vehiculoId   = ''
    openForm.tipo         = 'Preventivo'
    openForm.descripcion  = ''
    openForm.fechaIngreso = todayISO()
    openForm.costo        = 0
    openForm.tecnico      = authStore.user?.name ?? ''
}

function openCreateModal() {
    resetOpenForm()
    formError.value     = ''
    showCreateModal.value = true
}

async function submitOpenMaintenance() {
    formError.value = ''

    if (!openForm.vehiculoId) {
        formError.value = 'Selecciona un vehículo.'
        return
    }
    if (!openForm.descripcion.trim()) {
        formError.value = 'La descripción es obligatoria.'
        return
    }
    if (!openForm.tecnico.trim()) {
        formError.value = 'El técnico es obligatorio.'
        return
    }
    if (openForm.costo < 0) {
        formError.value = 'El costo no puede ser negativo.'
        return
    }
    if (openForm.fechaIngreso > todayISO()) {
        formError.value = 'La fecha de ingreso no puede ser futura.'
        return
    }

    const result = await maintenanceStore.openMaintenance({ ...openForm })

    if (result.success) {
        showCreateModal.value = false
        return
    }

    formError.value = result.error ?? 'No se pudo abrir el mantenimiento.'
}

// ─── Modal: cerrar mantenimiento ─────────────────────────────────
const showCloseModal  = ref(false)
const closingRecord   = ref<MaintenanceRecord | null>(null)
const closeError      = ref('')

const closeForm = reactive<MaintenanceCloseData>({
    fechaSalida:          todayISO(),
    kilometrajeSalida:    0,
    comentariosCierre:    '',
    proximoMantenimiento: '',
})

function openCloseModal(record: MaintenanceRecord) {
    closingRecord.value = record
    closeForm.fechaSalida = todayISO()

    const vehicle = vehiclesStore.vehicles.find(v => v.id === record.vehiculoId)
    closeForm.kilometrajeSalida    = vehicle?.kilometraje ?? record.kilometrajeIngreso
    closeForm.comentariosCierre    = ''
    closeForm.proximoMantenimiento = ''
    closeError.value               = ''
    showCloseModal.value           = true
}

async function submitCloseMaintenance() {
    if (!closingRecord.value) return
    closeError.value = ''

    if (!closeForm.fechaSalida) {
        closeError.value = 'La fecha de salida es obligatoria.'
        return
    }
    if (closeForm.kilometrajeSalida < closingRecord.value.kilometrajeIngreso) {
        closeError.value = `El kilometraje de salida debe ser ≥ ${closingRecord.value.kilometrajeIngreso} km.`
        return
    }
    if (closeForm.proximoMantenimiento && closeForm.proximoMantenimiento < todayISO()) {
        closeError.value = 'La fecha de próximo mantenimiento no puede ser pasada.'
        return
    }

    const payload: MaintenanceCloseData = {
        fechaSalida:       closeForm.fechaSalida,
        kilometrajeSalida: closeForm.kilometrajeSalida,
        comentariosCierre:    closeForm.comentariosCierre    || undefined,
        proximoMantenimiento: closeForm.proximoMantenimiento || undefined,
    }

    const result = await maintenanceStore.closeMaintenance(
        closingRecord.value.id,
        payload,
    )

    if (result.success) {
        showCloseModal.value  = false
        closingRecord.value   = null
        return
    }

    closeError.value = result.error ?? 'No se pudo cerrar el mantenimiento.'
}
</script>

<template>
    <div class="p-6 space-y-6">

        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h1 class="text-2xl font-bold text-slate-800">Mantenimiento</h1>
                <p class="text-sm text-slate-500 mt-1">
                    Gestión de vehículos actualmente en taller
                </p>
            </div>
            <button
                type="button"
                class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white
                    text-sm font-semibold px-5 py-3 rounded-xl transition shrink-0"
                @click="openCreateModal"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 4v16m8-8H4"/>
                </svg>
                Abrir mantenimiento
            </button>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="bg-white border border-slate-200 rounded-xl p-5">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Abiertos
                </p>
                <h3 class="text-3xl font-bold text-amber-600 mt-2">
                    {{ maintenanceStore.abiertos.length }}
                </h3>
            </div>
            <div class="bg-white border border-slate-200 rounded-xl p-5">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Vehículos disponibles
                </p>
                <h3 class="text-3xl font-bold text-blue-600 mt-2">
                    {{ eligibleVehicles.length }}
                </h3>
            </div>
        </div>

        <!-- Search -->
        <div class="max-w-sm w-full">
            <SearchBar
                v-model="search"
                placeholder="Buscar por placa, marca, técnico o tipo..."
            />
        </div>

        <!-- Table -->
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <DataTable
                :columns="columns"
                :rows="tableRows"
                row-key="id"
                empty-message="No hay mantenimientos abiertos."
            >

                <template #cell-vehiculo="{ row }: DataTableCellSlotProps">
                    <div class="space-y-1">
                        <p class="font-mono font-bold text-xs tracking-widest text-slate-800">
                            {{ (row as unknown as MaintenanceRecord).vehiculoPlaca }}
                        </p>
                        <p class="text-xs text-slate-400">
                            {{ (row as unknown as MaintenanceRecord).vehiculoMarca }}
                            {{ (row as unknown as MaintenanceRecord).vehiculoModelo }}
                        </p>
                    </div>
                </template>

                <template #cell-tipo="{ value }: DataTableCellSlotProps">
                    <span class="text-sm text-slate-700">{{ value as string }}</span>
                </template>

                <template #cell-tecnico="{ value }: DataTableCellSlotProps">
                    <span class="text-sm text-slate-700">{{ value as string }}</span>
                </template>

                <template #cell-fechaIngreso="{ value }: DataTableCellSlotProps">
                    <span class="font-mono text-xs text-slate-600">
                        {{ formatDate(value as string) }}
                    </span>
                </template>

                <template #cell-estado="{ value }: DataTableCellSlotProps">
                    <StatusBadge :status="value as string" />
                </template>

                <template #cell-costo="{ value }: DataTableCellSlotProps">
                    <span class="font-mono text-xs text-slate-700">
                        {{ formatCurrency(value as number) }}
                    </span>
                </template>

                <template #cell-acciones="{ row }: DataTableCellSlotProps">
                    <div class="flex justify-end">
                        <button
                            type="button"
                            class="px-3 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700
                                border border-amber-200 hover:bg-amber-100 transition"
                            @click="openCloseModal(asRecord(row))"
                        >
                            Cerrar
                        </button>
                    </div>
                </template>

                <template #pagination>
                    <div class="flex items-center justify-between">
                        <p class="text-xs text-slate-500">
                            Página {{ currentPage }} de {{ totalPages }}
                            ({{ filteredItems.length }} registros)
                        </p>
                        <div class="flex items-center gap-2">
                            <button
                                type="button"
                                class="px-3 py-1 text-xs border border-slate-200 rounded-lg
                                    hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                :disabled="currentPage === 1"
                                @click="currentPage--"
                            >
                                Anterior
                            </button>
                            <button
                                type="button"
                                class="px-3 py-1 text-xs border border-slate-200 rounded-lg
                                    hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                :disabled="currentPage === totalPages"
                                @click="currentPage++"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                </template>

            </DataTable>
        </div>

        <!-- Modal: abrir mantenimiento -->
        <BaseModal
            :show="showCreateModal"
            title="Abrir mantenimiento"
            size="lg"
            @close="showCreateModal = false"
        >
            <div class="space-y-4">

                <div
                    v-if="formError"
                    class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700"
                >
                    {{ formError }}
                </div>

                <div class="space-y-2">
                    <label class="text-xs font-semibold text-slate-600">Vehículo *</label>
                    <select
                        v-model="openForm.vehiculoId"
                        class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm
                            focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none"
                    >
                        <option value="">Selecciona un vehículo</option>
                        <option
                            v-for="v in eligibleVehicles"
                            :key="v.id"
                            :value="v.id"
                        >
                            {{ v.placa }} — {{ v.marca }} {{ v.modelo }}
                        </option>
                    </select>
                    <p
                        v-if="eligibleVehicles.length === 0"
                        class="text-xs text-amber-700"
                    >
                        No hay vehículos disponibles para mantenimiento.
                    </p>
                </div>

                <div class="space-y-2">
                    <label class="text-xs font-semibold text-slate-600">Tipo *</label>
                    <select
                        v-model="openForm.tipo"
                        class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm
                            focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none"
                    >
                        <option v-for="t in maintenanceTypes" :key="t" :value="t">
                            {{ t }}
                        </option>
                    </select>
                </div>

                <div class="space-y-2">
                    <label class="text-xs font-semibold text-slate-600">Descripción *</label>
                    <textarea
                        v-model="openForm.descripcion"
                        rows="3"
                        placeholder="Describe el trabajo a realizar..."
                        class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none
                            focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none"
                    />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <label class="text-xs font-semibold text-slate-600">Fecha ingreso *</label>
                        <input
                            v-model="openForm.fechaIngreso"
                            type="date"
                            :max="todayISO()"
                            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm
                                focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none"
                        />
                    </div>
                    <div class="space-y-2">
                        <label class="text-xs font-semibold text-slate-600">Técnico *</label>
                        <input
                            v-model="openForm.tecnico"
                            type="text"
                            placeholder="Nombre del técnico"
                            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm
                                focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none"
                        />
                    </div>
                </div>

                <div class="space-y-2">
                    <label class="text-xs font-semibold text-slate-600">Costo estimado (COP)</label>
                    <input
                        v-model.number="openForm.costo"
                        type="number"
                        min="0"
                        class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm
                            focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none"
                    />
                </div>
            </div>

            <template #footer>
                <div class="flex justify-end gap-3">
                    <button
                        type="button"
                        class="px-4 py-2 rounded-xl border border-slate-200
                            text-slate-600 hover:bg-slate-50 transition"
                        @click="showCreateModal = false"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        class="bg-blue-600 hover:bg-blue-700 text-white rounded-xl
                            px-5 py-2 text-sm font-semibold transition"
                        @click="submitOpenMaintenance"
                    >
                        Abrir mantenimiento
                    </button>
                </div>
            </template>
        </BaseModal>

        <!-- Modal: cerrar mantenimiento -->
        <BaseModal
            :show="showCloseModal"
            title="Cerrar mantenimiento"
            size="lg"
            @close="showCloseModal = false"
        >
            <div class="space-y-4">

                <div
                    v-if="closingRecord"
                    class="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1"
                >
                    <p class="text-xs font-semibold text-slate-600">Vehículo en taller</p>
                    <p class="text-sm font-semibold text-slate-800">
                        <span class="font-mono tracking-widest">{{ closingRecord.vehiculoPlaca }}</span>
                        — {{ closingRecord.vehiculoMarca }} {{ closingRecord.vehiculoModelo }}
                    </p>
                    <p class="text-xs text-slate-400">
                        Km ingreso:
                        {{ new Intl.NumberFormat('es-CO').format(closingRecord.kilometrajeIngreso) }} km
                    </p>
                </div>

                <div
                    v-if="closeError"
                    class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700"
                >
                    {{ closeError }}
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <label class="text-xs font-semibold text-slate-600">Fecha salida *</label>
                        <input
                            v-model="closeForm.fechaSalida"
                            type="date"
                            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm
                                focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none"
                        />
                    </div>
                    <div class="space-y-2">
                        <label class="text-xs font-semibold text-slate-600">Kilometraje salida *</label>
                        <input
                            v-model.number="closeForm.kilometrajeSalida"
                            type="number"
                            :min="closingRecord?.kilometrajeIngreso ?? 0"
                            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm
                                focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none"
                        />
                    </div>
                </div>

                <div class="space-y-2">
                    <label class="text-xs font-semibold text-slate-600">Comentarios de cierre</label>
                    <textarea
                        v-model="closeForm.comentariosCierre"
                        rows="3"
                        placeholder="Trabajo realizado, repuestos, observaciones..."
                        class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none
                            focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none"
                    />
                </div>

                <div class="space-y-2">
                    <label class="text-xs font-semibold text-slate-600">Próximo mantenimiento</label>
                    <input
                        v-model="closeForm.proximoMantenimiento"
                        type="date"
                        :min="todayISO()"
                        class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm
                            focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none"
                    />
                    <p class="text-xs text-slate-400">Opcional. Debe ser hoy o una fecha futura.</p>
                </div>
            </div>

            <template #footer>
                <div class="flex justify-end gap-3">
                    <button
                        type="button"
                        class="px-4 py-2 rounded-xl border border-slate-200
                            text-slate-600 hover:bg-slate-50 transition"
                        @click="showCloseModal = false"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        class="bg-blue-600 hover:bg-blue-700 text-white rounded-xl
                            px-5 py-2 text-sm font-semibold transition"
                        @click="submitCloseMaintenance"
                    >
                        Cerrar mantenimiento
                    </button>
                </div>
            </template>
        </BaseModal>

    </div>
</template>