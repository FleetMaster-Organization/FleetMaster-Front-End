<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useVehiclesStore } from '@/stores/vehicles'
import DataTable from '@/components/ui/DataTable.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import SearchBar from '@/components/ui/SearchBar.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import type { Vehicle, VehicleFormData, VehicleStatus, VehicleType } from '@/types'

const store = useVehiclesStore()

// ─── Filtros ────────────────────────────────────────────────
const search = ref('')
const filterStatus = ref<VehicleStatus | 'Todos'>('Todos')

const statusOptions: Array<VehicleStatus | 'Todos'> = [
    'Todos', 'Disponible', 'Asignado', 'Mantenimiento', 'Vendido',
]

const filteredVehicles = computed(() => {
    let result = store.vehicles
    if (filterStatus.value !== 'Todos') {
        result = result.filter(v => v.estado === filterStatus.value)
    }
    if (search.value.trim()) {
        const q = search.value.trim().toLowerCase()
        result = result.filter(
        v =>
            v.placa.toLowerCase().includes(q) ||
            v.marca.toLowerCase().includes(q) ||
            v.vin.toLowerCase().includes(q)
        )
    }
    return result
})

// ─── Paginación (REQ-12: máx 20 por página) ─────────────────
const currentPage = ref(1)
const PAGE_SIZE = 20

const paginatedVehicles = computed(() => {
    const start = (currentPage.value - 1) * PAGE_SIZE
    return filteredVehicles.value.slice(start, start + PAGE_SIZE)
})
const totalPages = computed(() =>
    Math.max(1, Math.ceil(filteredVehicles.value.length / PAGE_SIZE))
)

// ─── Columnas tabla ──────────────────────────────────────────
const columns = [
    { key: 'placa', label: 'Placa', width: '110px' },
    { key: 'marca', label: 'Marca' },
    { key: 'modelo', label: 'Modelo' },
    { key: 'anio', label: 'Año', width: '70px', align: 'center' as const },
    { key: 'tipo', label: 'Tipo', width: '100px' },
    { key: 'estado', label: 'Estado', width: '130px' },
    { key: 'conductorAsignadoNombre', label: 'Conductor' },
    { key: 'kilometraje', label: 'Km', width: '100px', align: 'right' as const },
    { key: 'actions', label: 'Acciones', width: '110px', align: 'center' as const },
]

// ─── Modal Crear / Editar ────────────────────────────────────
const showFormModal = ref(false)
const editingVehicle = ref<Vehicle | null>(null)
const formError = ref('')

const EMPTY_FORM = (): VehicleFormData => ({
    vin: '', placa: '', marca: '', modelo: '',
    anio: new Date().getFullYear(), tipo: 'Camión',
    estado: 'Disponible', kilometraje: 0,
    fechaVencimientoSoat: '', fechaVencimientoTecnomecanica: '',
})

const form = reactive<VehicleFormData>(EMPTY_FORM())

function openCreate() {
    editingVehicle.value = null
    Object.assign(form, EMPTY_FORM())
    formError.value = ''
    showFormModal.value = true
}

function openEdit(v: Vehicle) {
    editingVehicle.value = v
    Object.assign(form, {
        vin: v.vin, placa: v.placa, marca: v.marca, modelo: v.modelo,
        anio: v.anio, tipo: v.tipo, estado: v.estado, kilometraje: v.kilometraje,
        fechaVencimientoSoat: v.fechaVencimientoSoat,
        fechaVencimientoTecnomecanica: v.fechaVencimientoTecnomecanica,
    })
    formError.value = ''
    showFormModal.value = true
}

function submitForm() {
    formError.value = ''
    if (!form.vin || !form.placa || !form.marca || !form.modelo) {
        formError.value = 'Por favor completa todos los campos obligatorios.'
        return
    }
    if (form.kilometraje < 0) {
        formError.value = 'El kilometraje debe ser un valor positivo.'
        return
    }

    let result: { success: boolean; error?: string }

    if (editingVehicle.value) {
        const { vin: _vin, placa: _placa, ...updateData } = form
        result = store.updateVehicle(editingVehicle.value.id, updateData)
    } else {
        result = store.createVehicle({ ...form })
    }

    if (result.success) {
        showFormModal.value = false
    } else {
        formError.value = result.error ?? 'Error desconocido.'
    }
}

// ─── Modal Confirmación (Vender / inactivar) ─────────────────
const showConfirmModal = ref(false)
const confirmTarget = ref<Vehicle | null>(null)

function openConfirm(v: Vehicle) {
    confirmTarget.value = v
    showConfirmModal.value = true
}

const confirmError = ref('')
function confirmAction() {
    if (!confirmTarget.value) return
    const result = store.sellVehicle(confirmTarget.value.id)
    if (result.success) {
        showConfirmModal.value = false
        confirmTarget.value = null
        confirmError.value = ''
    } else {
        confirmError.value = result.error ?? 'Error.'
    }
}

// ─── Tipos y estados para selects ────────────────────────────
const vehicleTypes: VehicleType[] = ['Camión', 'Van', 'Moto', 'Automóvil', 'Bus']
const vehicleStatuses: VehicleStatus[] = ['Disponible', 'Asignado', 'Mantenimiento', 'Vendido']

function formatKm(km: number): string {
    return new Intl.NumberFormat('es-CO').format(km) + ' km'
}
</script>

<template>
    <div class="p-6 space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
        <div>
            <h1 class="text-2xl font-bold text-slate-800">Vehículos</h1>
            <p class="text-sm text-slate-500 mt-0.5">
            {{ store.activeVehicles.length }} vehículos activos ·
            {{ store.disponibles.length }} disponibles ·
            {{ store.asignados.length }} asignados ·
            {{ store.enMantenimiento.length }} en mantenimiento
            </p>
        </div>
        <button
            class="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700
                text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
            @click="openCreate"
        >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Agregar vehículo
        </button>
        </div>

        <!-- Stat pills -->
        <div class="flex gap-3 flex-wrap">
        <button
            v-for="s in statusOptions"
            :key="s"
            :class="[
            'px-4 py-1.5 rounded-full text-sm font-medium border transition-all',
            filterStatus === s
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300',
            ]"
            @click="filterStatus = s; currentPage = 1"
        >
            {{ s }}
            <span v-if="s === 'Todos'" class="ml-1 text-xs opacity-70">({{ store.vehicles.length }})</span>
        </button>
        </div>

        <!-- Barra búsqueda -->
        <div class="flex gap-3">
        <div class="flex-1 max-w-sm">
            <SearchBar v-model="search" placeholder="Buscar por placa, marca o VIN..." />
        </div>
        </div>

        <!-- Tabla -->
        <DataTable
        :columns="columns"
        :rows="paginatedVehicles"
        row-key="id"
        empty-message="No se encontraron vehículos con los filtros actuales."
        >
        <!-- Placa -->
        <template #cell-placa="{ row }">
            <span class="font-mono font-semibold text-slate-800 text-xs tracking-widest">
            {{ (row as Vehicle).placa }}
            </span>
        </template>

        <!-- Estado -->
        <template #cell-estado="{ row }">
            <StatusBadge :status="(row as Vehicle).estado" />
        </template>

        <!-- Conductor -->
        <template #cell-conductorAsignadoNombre="{ row }">
            <span :class="(row as Vehicle).conductorAsignadoNombre ? 'text-slate-700' : 'text-slate-300 italic'">
            {{ (row as Vehicle).conductorAsignadoNombre ?? 'Sin asignar' }}
            </span>
        </template>

        <!-- Kilometraje -->
        <template #cell-kilometraje="{ row }">
            <span class="font-mono text-slate-600 text-xs">{{ formatKm((row as Vehicle).kilometraje) }}</span>
        </template>

        <!-- Acciones -->
        <template #cell-actions="{ row }">
            <div class="flex items-center justify-center gap-1">
            <button
                class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Editar"
                @click="openEdit(row as Vehicle)"
            >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                />
                </svg>
            </button>
            <button
                v-if="(row as Vehicle).estado !== 'Vendido'"
                class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Marcar como vendido"
                @click="openConfirm(row as Vehicle)"
            >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
                </svg>
            </button>
            </div>
        </template>

        <!-- Paginación -->
        <template #pagination>
            <div class="flex items-center justify-between text-sm text-slate-500">
            <span>
                Mostrando {{ paginatedVehicles.length }} de {{ filteredVehicles.length }} vehículos
            </span>
            <div class="flex gap-2">
                <button
                :disabled="currentPage === 1"
                class="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40
                        hover:bg-slate-100 transition-colors disabled:cursor-not-allowed"
                @click="currentPage--"
                >
                ← Anterior
                </button>
                <span class="px-3 py-1 text-slate-700 font-medium">
                {{ currentPage }} / {{ totalPages }}
                </span>
                <button
                :disabled="currentPage === totalPages"
                class="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40
                        hover:bg-slate-100 transition-colors disabled:cursor-not-allowed"
                @click="currentPage++"
                >
                Siguiente →
                </button>
            </div>
            </div>
        </template>
        </DataTable>

        <!-- ─── Modal Crear / Editar ──────────────────────────────── -->
        <BaseModal
        :show="showFormModal"
        :title="editingVehicle ? 'Editar vehículo' : 'Registrar nuevo vehículo'"
        size="lg"
        @close="showFormModal = false"
        >
        <form class="space-y-4" @submit.prevent="submitForm">
            <div class="grid grid-cols-2 gap-4">
            <!-- VIN (solo editable en creación) -->
            <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                VIN <span class="text-red-500">*</span>
                </label>
                <input
                v-model="form.vin"
                type="text"
                :disabled="!!editingVehicle"
                :class="[
                    'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all font-mono',
                    editingVehicle ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : 'bg-white border-slate-200',
                ]"
                placeholder="1HGBH41JXMN109186"
                />
                <p v-if="editingVehicle" class="mt-1 text-xs text-slate-400">El VIN no se puede modificar.</p>
            </div>

            <!-- Placa (solo editable en creación) -->
            <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                Placa <span class="text-red-500">*</span>
                </label>
                <input
                v-model="form.placa"
                type="text"
                :disabled="!!editingVehicle"
                :class="[
                    'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all font-mono tracking-widest uppercase',
                    editingVehicle ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : 'bg-white border-slate-200',
                ]"
                placeholder="ABC-123"
                />
                <p v-if="editingVehicle" class="mt-1 text-xs text-slate-400">La placa no se puede modificar.</p>
            </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">Marca <span class="text-red-500">*</span></label>
                <input v-model="form.marca" type="text"
                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                placeholder="Toyota"
                />
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">Modelo <span class="text-red-500">*</span></label>
                <input v-model="form.modelo" type="text"
                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                placeholder="Hilux"
                />
            </div>
            </div>

            <div class="grid grid-cols-3 gap-4">
            <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">Año</label>
                <input v-model.number="form.anio" type="number" min="1990" :max="new Date().getFullYear() + 1"
                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">Tipo</label>
                <select v-model="form.tipo"
                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                >
                <option v-for="t in vehicleTypes" :key="t" :value="t">{{ t }}</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">Kilometraje <span class="text-red-500">*</span></label>
                <input v-model.number="form.kilometraje" type="number" min="0"
                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
            </div>
            </div>

            <!-- Estado (solo en edición, creación siempre = Disponible) -->
            <div v-if="editingVehicle">
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Estado operativo</label>
            <select v-model="form.estado"
                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
            >
                <option v-for="s in vehicleStatuses" :key="s" :value="s">{{ s }}</option>
            </select>
            <p v-if="editingVehicle?.conductorAsignadoId" class="mt-1 text-xs text-amber-600">
                ⚠ Este vehículo tiene un conductor asignado. No se puede cambiar el estado.
            </p>
            </div>
            <div v-else class="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p class="text-xs text-blue-700">
                <strong>Estado inicial:</strong> El vehículo se registrará automáticamente como
                <StatusBadge status="Disponible" class="ml-1" />
            </p>
            </div>

            <!-- Fechas legales -->
            <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">Vencimiento SOAT <span class="text-red-500">*</span></label>
                <input v-model="form.fechaVencimientoSoat" type="date"
                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">Vencimiento Tecnomecánica <span class="text-red-500">*</span></label>
                <input v-model="form.fechaVencimientoTecnomecanica" type="date"
                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
            </div>
            </div>

            <!-- Error -->
            <div v-if="formError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-700">{{ formError }}</p>
            </div>
        </form>

        <template #footer>
            <div class="flex justify-end gap-3">
            <button
                class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                @click="showFormModal = false"
            >
                Cancelar
            </button>
            <button
                class="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
                @click="submitForm"
            >
                {{ editingVehicle ? 'Guardar cambios' : 'Registrar vehículo' }}
            </button>
            </div>
        </template>
        </BaseModal>

        <!-- ─── Modal Confirmar Venta ────────────────────────────── -->
        <BaseModal
        :show="showConfirmModal"
        title="Inactivar vehículo"
        size="sm"
        @close="showConfirmModal = false"
        >
        <div class="space-y-4">
            <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p class="text-sm text-amber-800">
                ¿Confirmas marcar el vehículo
                <strong>{{ confirmTarget?.placa }}</strong> como
                <strong>Vendido</strong>? Esta acción lo retirará operativamente.
            </p>
            </div>
            <p class="text-xs text-slate-500">
            El registro se conservará en el sistema (no se elimina físicamente).
            </p>
            <div v-if="confirmError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-700">{{ confirmError }}</p>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end gap-3">
            <button
                class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                @click="showConfirmModal = false; confirmError = ''"
            >
                Cancelar
            </button>
            <button
                class="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                @click="confirmAction"
            >
                Sí, marcar como vendido
            </button>
            </div>
        </template>
        </BaseModal>
    </div>
</template>