<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useDriversStore } from '@/stores/drivers'
import DataTable from '@/components/ui/DataTable.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import SearchBar from '@/components/ui/SearchBar.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import type { Driver, DriverFormData, DriverStatus, LicenseType } from '@/types'

const store = useDriversStore()

// ─── Filtros ─────────────────────────────────────────────────
const search = ref('')
const filterStatus = ref<DriverStatus | 'Todos'>('Todos')

const statusOptions: Array<DriverStatus | 'Todos'> = [
    'Todos', 'Activo', 'Asignado', 'Inactivo',
]

const filteredDrivers = computed(() => {
    let result = store.drivers
    if (filterStatus.value !== 'Todos') {
        result = result.filter(d => d.estado === filterStatus.value)
    }
    if (search.value.trim()) {
        const q = search.value.trim().toLowerCase()
        result = result.filter(
        d =>
            d.nombre.toLowerCase().includes(q) ||
            d.cedula.includes(q)
        )
    }
    return result
})

// ─── Paginación ──────────────────────────────────────────────
const currentPage = ref(1)
const PAGE_SIZE = 20

const paginatedDrivers = computed(() => {
    const start = (currentPage.value - 1) * PAGE_SIZE
    return filteredDrivers.value.slice(start, start + PAGE_SIZE)
})
const totalPages = computed(() =>
    Math.max(1, Math.ceil(filteredDrivers.value.length / PAGE_SIZE))
)

// ─── Columnas ────────────────────────────────────────────────
const columns = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'cedula', label: 'Cédula', width: '130px' },
    { key: 'telefono', label: 'Teléfono', width: '120px' },
    { key: 'tipoLicencia', label: 'Licencia', width: '80px', align: 'center' as const },
    { key: 'estadoLegal', label: 'Estado licencia', width: '140px' },
    { key: 'estado', label: 'Estado', width: '110px' },
    { key: 'vehiculoAsignadoPlaca', label: 'Vehículo', width: '110px' },
    { key: 'actions', label: 'Acciones', width: '120px', align: 'center' as const },
]

// ─── Modal Crear / Editar ────────────────────────────────────
const showFormModal = ref(false)
const editingDriver = ref<Driver | null>(null)
const formError = ref('')

const EMPTY_FORM = (): DriverFormData => ({
    nombre: '', cedula: '', telefono: '', email: '',
    tipoLicencia: 'B1', fechaVencimientoLicencia: '',
    estado: 'Activo',
    contactoEmergenciaNombre: '', contactoEmergenciaTelefono: '',
})

const form = reactive<DriverFormData>(EMPTY_FORM())

function openCreate() {
    editingDriver.value = null
    Object.assign(form, EMPTY_FORM())
    formError.value = ''
    showFormModal.value = true
}

function openEdit(d: Driver) {
    editingDriver.value = d
    Object.assign(form, {
        nombre: d.nombre, cedula: d.cedula, telefono: d.telefono, email: d.email,
        tipoLicencia: d.tipoLicencia, fechaVencimientoLicencia: d.fechaVencimientoLicencia,
        estado: d.estado,
        contactoEmergenciaNombre: d.contactoEmergenciaNombre,
        contactoEmergenciaTelefono: d.contactoEmergenciaTelefono,
    })
    formError.value = ''
    showFormModal.value = true
}

function submitForm() {
    formError.value = ''
    if (!form.nombre || !form.cedula || !form.tipoLicencia || !form.fechaVencimientoLicencia) {
        formError.value = 'Por favor completa todos los campos obligatorios.'
        return
    }

    let result: { success: boolean; error?: string }

    if (editingDriver.value) {
        const { cedula: _cedula, ...updateData } = form
        result = store.updateDriver(editingDriver.value.id, updateData)
    } else {
        result = store.createDriver({ ...form })
    }

    if (result.success) {
        showFormModal.value = false
    } else {
        formError.value = result.error ?? 'Error desconocido.'
    }
}

// ─── Acciones rápidas (activar / inactivar) ──────────────────
const showConfirmModal = ref(false)
const confirmTarget = ref<Driver | null>(null)
const confirmAction = ref<'deactivate' | 'activate'>('deactivate')
const confirmError = ref('')

function openConfirmDeactivate(d: Driver) {
    confirmTarget.value = d
    confirmAction.value = 'deactivate'
    confirmError.value = ''
    showConfirmModal.value = true
}

function openConfirmActivate(d: Driver) {
    confirmTarget.value = d
    confirmAction.value = 'activate'
    confirmError.value = ''
    showConfirmModal.value = true
}

function doConfirmAction() {
    if (!confirmTarget.value) return
    const result = confirmAction.value === 'deactivate'
        ? store.deactivateDriver(confirmTarget.value.id)
        : store.activateDriver(confirmTarget.value.id)

    if (result.success) {
        showConfirmModal.value = false
        confirmTarget.value = null
        confirmError.value = ''
    } else {
        confirmError.value = result.error ?? 'Error.'
    }
}

const licenseTypes: LicenseType[] = ['A1', 'A2', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3']
const driverStatuses: DriverStatus[] = ['Activo', 'Inactivo', 'Asignado']

// REQ-20: indicador visual de licencia
function licenseRowClass(d: Driver): string {
    if (d.estadoLegal === 'Vencida') return 'bg-red-50/40'
    if (d.estadoLegal === 'Por vencer') return 'bg-amber-50/40'
    return ''
}
</script>

<template>
    <div class="p-6 space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
        <div>
            <h1 class="text-2xl font-bold text-slate-800">Conductores</h1>
            <p class="text-sm text-slate-500 mt-0.5">
            {{ store.drivers.length }} conductores en total ·
            {{ store.activos.length }} activos ·
            {{ store.asignados.length }} asignados ·
            <span v-if="store.conLicenciaVencida.length > 0" class="text-red-600 font-medium">
                {{ store.conLicenciaVencida.length }} con licencia vencida
            </span>
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
            Agregar conductor
        </button>
        </div>

        <!-- Alerta licencias vencidas (REQ-20) -->
        <div
        v-if="store.conLicenciaVencida.length > 0 || store.conLicenciaPorVencer.length > 0"
        class="flex gap-3 flex-wrap"
        >
        <div
            v-if="store.conLicenciaVencida.length > 0"
            class="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
        >
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
            </svg>
            <strong>{{ store.conLicenciaVencida.length }}</strong> conductor(es) con licencia vencida
        </div>
        <div
            v-if="store.conLicenciaPorVencer.length > 0"
            class="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700"
        >
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
            </svg>
            <strong>{{ store.conLicenciaPorVencer.length }}</strong> conductor(es) con licencia por vencer (&le;30 días)
        </div>
        </div>

        <!-- Filtros estado -->
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
        </button>
        </div>

        <!-- Búsqueda -->
        <div class="max-w-sm">
        <SearchBar v-model="search" placeholder="Buscar por nombre o cédula..." />
        </div>

        <!-- Tabla -->
        <DataTable
        :columns="columns"
        :rows="paginatedDrivers"
        row-key="id"
        empty-message="No se encontraron conductores con los filtros actuales."
        >
        <!-- Nombre -->
        <template #cell-nombre="{ row }">
            <div class="flex items-center gap-2">
            <!-- REQ-20: indicador visual en nombre -->
            <span
                v-if="(row as Driver).estadoLegal === 'Vencida'"
                class="w-2 h-2 rounded-full bg-red-500 shrink-0"
                title="Licencia vencida"
            />
            <span
                v-else-if="(row as Driver).estadoLegal === 'Por vencer'"
                class="w-2 h-2 rounded-full bg-amber-500 shrink-0"
                title="Licencia por vencer"
            />
            <span class="font-medium text-slate-800">{{ (row as Driver).nombre }}</span>
            </div>
        </template>

        <!-- Cédula -->
        <template #cell-cedula="{ row }">
            <span class="font-mono text-xs text-slate-600">{{ (row as Driver).cedula }}</span>
        </template>

        <!-- Licencia -->
        <template #cell-tipoLicencia="{ row }">
            <span class="inline-flex items-center justify-center w-9 h-6 bg-slate-100 text-slate-700 text-xs font-bold rounded-md">
            {{ (row as Driver).tipoLicencia }}
            </span>
        </template>

        <!-- Estado licencia -->
        <template #cell-estadoLegal="{ row }">
            <StatusBadge :status="(row as Driver).estadoLegal" />
        </template>

        <!-- Estado operativo -->
        <template #cell-estado="{ row }">
            <StatusBadge :status="(row as Driver).estado" />
        </template>

        <!-- Vehículo -->
        <template #cell-vehiculoAsignadoPlaca="{ row }">
            <span
            v-if="(row as Driver).vehiculoAsignadoPlaca"
            class="font-mono font-semibold text-xs tracking-widest text-blue-700 bg-blue-50 px-2 py-0.5 rounded"
            >
            {{ (row as Driver).vehiculoAsignadoPlaca }}
            </span>
            <span v-else class="text-slate-300 italic text-xs">Sin vehículo</span>
        </template>

        <!-- Acciones -->
        <template #cell-actions="{ row }">
            <div class="flex items-center justify-center gap-1">
            <!-- Editar -->
            <button
                class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Editar"
                @click="openEdit(row as Driver)"
            >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                />
                </svg>
            </button>

            <!-- Inactivar -->
            <button
                v-if="(row as Driver).estado !== 'Inactivo'"
                class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Inactivar"
                @click="openConfirmDeactivate(row as Driver)"
            >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
                </svg>
            </button>

            <!-- Activar -->
            <button
                v-if="(row as Driver).estado === 'Inactivo'"
                class="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                title="Activar"
                @click="openConfirmActivate(row as Driver)"
            >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
                </svg>
            </button>
            </div>
        </template>

        <!-- Paginación -->
        <template #pagination>
            <div class="flex items-center justify-between text-sm text-slate-500">
            <span>Mostrando {{ paginatedDrivers.length }} de {{ filteredDrivers.length }} conductores</span>
            <div class="flex gap-2">
                <button
                :disabled="currentPage === 1"
                class="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-colors disabled:cursor-not-allowed"
                @click="currentPage--"
                >
                ← Anterior
                </button>
                <span class="px-3 py-1 text-slate-700 font-medium">{{ currentPage }} / {{ totalPages }}</span>
                <button
                :disabled="currentPage === totalPages"
                class="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-colors disabled:cursor-not-allowed"
                @click="currentPage++"
                >
                Siguiente →
                </button>
            </div>
            </div>
        </template>
        </DataTable>

        <!-- ─── Modal Crear / Editar ─────────────────────────────── -->
        <BaseModal
        :show="showFormModal"
        :title="editingDriver ? 'Editar conductor' : 'Registrar nuevo conductor'"
        size="lg"
        @close="showFormModal = false"
        >
        <form class="space-y-4" @submit.prevent="submitForm">
            <!-- Nombre -->
            <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                Nombre completo <span class="text-red-500">*</span>
            </label>
            <input v-model="form.nombre" type="text"
                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                placeholder="Diomedes Díaz"
            />
            </div>

            <div class="grid grid-cols-2 gap-4">
            <!-- Cédula (inmutable en edición) -->
            <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                Cédula <span class="text-red-500">*</span>
                </label>
                <input
                v-model="form.cedula"
                type="text"
                :disabled="!!editingDriver"
                :class="[
                    'w-full px-3 py-2 text-sm border rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all',
                    editingDriver ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : 'bg-white border-slate-200',
                ]"
                placeholder="10445231890"
                />
                <p v-if="editingDriver" class="mt-1 text-xs text-slate-400">La cédula no se puede modificar.</p>
            </div>

            <!-- Teléfono -->
            <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">Teléfono</label>
                <input v-model="form.telefono" type="tel"
                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                placeholder="3201234567"
                />
            </div>
            </div>

            <!-- Email -->
            <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Correo electrónico</label>
            <input v-model="form.email" type="email"
                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                placeholder="conductor@logifast.com"
            />
            </div>

            <div class="grid grid-cols-2 gap-4">
            <!-- Tipo licencia -->
            <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                Categoría de licencia <span class="text-red-500">*</span>
                </label>
                <select v-model="form.tipoLicencia"
                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                >
                <option v-for="t in licenseTypes" :key="t" :value="t">{{ t }}</option>
                </select>
            </div>

            <!-- Fecha vencimiento -->
            <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                Vencimiento licencia <span class="text-red-500">*</span>
                </label>
                <input v-model="form.fechaVencimientoLicencia" type="date"
                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
            </div>
            </div>

            <!-- Estado (solo en edición) -->
            <div v-if="editingDriver">
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Estado</label>
            <select v-model="form.estado"
                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
            >
                <option v-for="s in driverStatuses" :key="s" :value="s">{{ s }}</option>
            </select>
            </div>

            <!-- Contacto de emergencia -->
            <div class="border-t border-slate-100 pt-4">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Contacto de emergencia <span class="text-red-500">*</span>
            </p>
            <div class="grid grid-cols-2 gap-4">
                <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">Nombre</label>
                <input v-model="form.contactoEmergenciaNombre" type="text"
                    class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                    placeholder="Rosa Díaz"
                />
                </div>
                <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1.5">Teléfono</label>
                <input v-model="form.contactoEmergenciaTelefono" type="tel"
                    class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                    placeholder="3109876543"
                />
                </div>
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
                {{ editingDriver ? 'Guardar cambios' : 'Registrar conductor' }}
            </button>
            </div>
        </template>
        </BaseModal>

        <!-- ─── Modal Confirmación ────────────────────────────────── -->
        <BaseModal
        :show="showConfirmModal"
        :title="confirmAction === 'deactivate' ? 'Inactivar conductor' : 'Activar conductor'"
        size="sm"
        @close="showConfirmModal = false"
        >
        <div class="space-y-3">
            <div
            :class="[
                'p-3 rounded-lg border text-sm',
                confirmAction === 'deactivate'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800',
            ]"
            >
            <p v-if="confirmAction === 'deactivate'">
                ¿Inactivar a <strong>{{ confirmTarget?.nombre }}</strong>?
                No podrá participar en nuevas asignaciones operativas.
            </p>
            <p v-else>
                ¿Activar a <strong>{{ confirmTarget?.nombre }}</strong>?
                Quedará disponible para nuevas asignaciones.
            </p>
            </div>
            <div v-if="confirmError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-700">{{ confirmError }}</p>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end gap-3">
            <button
                class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                @click="showConfirmModal = false"
            >
                Cancelar
            </button>
            <button
                :class="[
                'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
                confirmAction === 'deactivate'
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-emerald-600 hover:bg-emerald-700',
                ]"
                @click="doConfirmAction"
            >
                {{ confirmAction === 'deactivate' ? 'Sí, inactivar' : 'Sí, activar' }}
            </button>
            </div>
        </template>
        </BaseModal>
    </div>
</template>