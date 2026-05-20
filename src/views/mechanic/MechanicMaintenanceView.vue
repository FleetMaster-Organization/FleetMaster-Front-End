<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { useMaintenanceStore } from '@/stores/maintenance'
import { useVehiclesStore } from '@/stores/vehicles'
import { useAuthStore } from '@/stores/auth'
import DataTable from '@/components/ui/DataTable.vue'
import SearchBar from '@/components/ui/SearchBar.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import type {
MaintenanceRecord,
MaintenanceFormData,
MaintenanceCloseData,
MaintenanceType,
} from '@/types'

type Column = {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
}

// ── Stores ────────────────────────────────────────────────────────────────
const maintenanceStore = useMaintenanceStore()
const vehiclesStore    = useVehiclesStore()
const authStore        = useAuthStore()

const currentUser = computed(() => authStore.user?.email ?? 'mechanic')

// ── Tabs ──────────────────────────────────────────────────────────────────
type Tab = 'Todos' | 'Abiertos' | 'Cerrados'
const activeTab = ref<Tab>('Todos')

const tabs: Tab[] = ['Todos', 'Abiertos', 'Cerrados']

function tabCount(tab: Tab): number {
if (tab === 'Todos')    return maintenanceStore.abiertos.length + maintenanceStore.cerrados.length
if (tab === 'Abiertos') return maintenanceStore.abiertos.length
return maintenanceStore.cerrados.length
}

// ── Search & filtrado reactivo ────────────────────────────────────────────
const search = ref('')

const baseList = computed<MaintenanceRecord[]>(() => {
if (activeTab.value === 'Abiertos') return maintenanceStore.abiertos
if (activeTab.value === 'Cerrados') return maintenanceStore.cerrados
return [...maintenanceStore.abiertos, ...maintenanceStore.cerrados]
})

const filteredItems = computed<MaintenanceRecord[]>(() => {
const q = search.value.trim().toLowerCase()
if (!q) return baseList.value
return baseList.value.filter(r =>
    r.vehiculoPlaca.toLowerCase().includes(q) ||
    r.vehiculoMarca.toLowerCase().includes(q) ||
    r.tecnico.toLowerCase().includes(q) ||
    r.tipo.toLowerCase().includes(q),
)
})

// ── Paginación ────────────────────────────────────────────────────────────
const PAGE_SIZE   = 20
const currentPage = ref(1)

watch([search, activeTab], () => { currentPage.value = 1 })

const paginatedItems = computed<MaintenanceRecord[]>(() => {
const start = (currentPage.value - 1) * PAGE_SIZE
return filteredItems.value.slice(start, start + PAGE_SIZE)
})

const totalPages = computed(() =>
Math.max(1, Math.ceil(filteredItems.value.length / PAGE_SIZE)),
)

// ── Columnas DataTable ────────────────────────────────────────────────────
const columns: Column[] = [
{ key: 'vehiculo',     label: 'Vehículo' },
{ key: 'tipo',         label: 'Tipo' },
{ key: 'tecnico',      label: 'Técnico' },
{ key: 'fechaIngreso', label: 'Fecha ingreso' },
{ key: 'estado',       label: 'Estado',   align: 'center' },
{ key: 'costo',        label: 'Costo',    align: 'right' },
{ key: 'actions',      label: 'Acciones', align: 'center' },
]

// ── Helpers de formato ────────────────────────────────────────────────────
function fmtDate(iso: string | null): string {
if (!iso) return '—'
return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
}).format(new Date(iso))
}

function fmtCOP(value: number): string {
return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
}).format(value)
}

// ── Modal: abrir mantenimiento ────────────────────────────────────────────
const showOpenModal = ref(false)
const openError     = ref('')

const EMPTY_OPEN_FORM = (): MaintenanceFormData => ({
vehiculoId:  '',
tipo:        'Preventivo',
descripcion: '',
fechaIngreso: new Date().toISOString().split('T')[0],
costo:       0,
tecnico:     '',
})

const openForm = reactive<MaintenanceFormData>(EMPTY_OPEN_FORM())

const maintenanceTypes: MaintenanceType[] = ['Preventivo', 'Correctivo', 'Revisión']

const eligibleVehicles = computed(() =>
vehiclesStore.vehicles.filter(v =>
    v.estadoAdministrativo !== 'Vendido' &&
    v.estadoOperativo !== 'En ruta' &&
    !maintenanceStore.abiertos.some(r => r.vehiculoId === v.id),
),
)

const today = computed(() => new Date().toISOString().split('T')[0])

function openCreateModal() {
Object.assign(openForm, EMPTY_OPEN_FORM())
openError.value = ''
showOpenModal.value = true
}

function submitOpen() {
openError.value = ''

if (!openForm.vehiculoId)  { openError.value = 'Selecciona un vehículo.'; return }
if (!openForm.descripcion.trim()) { openError.value = 'La descripción es obligatoria.'; return }
if (!openForm.tecnico.trim())     { openError.value = 'El técnico es obligatorio.'; return }
if (openForm.costo < 0)           { openError.value = 'El costo no puede ser negativo.'; return }
if (openForm.fechaIngreso > today.value) {
    openError.value = 'La fecha de ingreso no puede ser futura.'
    return
}

const result = maintenanceStore.openMaintenance({ ...openForm })
if (result.success) {
    showOpenModal.value = false
} else {
    openError.value = result.error ?? 'Error al abrir el mantenimiento.'
}
}

// ── Modal: cerrar mantenimiento ───────────────────────────────────────────
const showCloseModal  = ref(false)
const closingRecord   = ref<MaintenanceRecord | null>(null)
const closeError      = ref('')

const EMPTY_CLOSE_FORM = (): MaintenanceCloseData => ({
fechaSalida:          new Date().toISOString().split('T')[0],
kilometrajeSalida:    0,
comentariosCierre:    '',
proximoMantenimiento: '',
})

const closeForm = reactive<MaintenanceCloseData>(EMPTY_CLOSE_FORM())

function openCloseModal(record: MaintenanceRecord) {
closingRecord.value = record
Object.assign(closeForm, EMPTY_CLOSE_FORM())
closeError.value = ''
showCloseModal.value = true
}

function submitClose() {
closeError.value = ''
if (!closingRecord.value) return

if (!closeForm.fechaSalida) {
    closeError.value = 'La fecha de salida es obligatoria.'
    return
}
if (closeForm.kilometrajeSalida < closingRecord.value.kilometrajeIngreso) {
    closeError.value = `El kilometraje de salida debe ser ≥ ${closingRecord.value.kilometrajeIngreso} km.`
    return
}
if (closeForm.proximoMantenimiento && closeForm.proximoMantenimiento < today.value) {
    closeError.value = 'La fecha de próximo mantenimiento no puede ser pasada.'
    return
}

const payload: MaintenanceCloseData = {
    fechaSalida:       closeForm.fechaSalida,
    kilometrajeSalida: closeForm.kilometrajeSalida,
    comentariosCierre:    closeForm.comentariosCierre    || undefined,
    proximoMantenimiento: closeForm.proximoMantenimiento || undefined,
}

const result = maintenanceStore.closeMaintenance(closingRecord.value.id, payload)
if (result.success) {
    showCloseModal.value = false
    closingRecord.value  = null
} else {
    closeError.value = result.error ?? 'Error al cerrar el mantenimiento.'
}
}

// ── Modal: ver detalle (solo lectura) ─────────────────────────────────────
const showDetailModal  = ref(false)
const detailRecord     = ref<MaintenanceRecord | null>(null)

function openDetail(record: MaintenanceRecord) {
detailRecord.value   = record
showDetailModal.value = true
}
</script>

<template>
<div class="p-6 space-y-6">

    <!-- ── Header ── -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
        <h1 class="text-slate-800 font-bold text-2xl">Mantenimiento</h1>
        <p class="text-slate-400 text-sm mt-0.5">Gestión operativa de vehículos en taller</p>
    </div>
    <button
        class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white
            text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shrink-0"
        @click="openCreateModal"
    >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 4v16m8-8H4"/>
        </svg>
        Abrir mantenimiento
    </button>
    </div>

    <!-- ── Tabs ── -->
    <div class="bg-slate-100 p-1 rounded-xl inline-flex gap-1">
    <button
        v-for="tab in tabs"
        :key="tab"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === tab
        ? 'bg-white shadow-sm text-slate-800'
        : 'text-slate-500 hover:text-slate-700'"
        @click="activeTab = tab"
    >
        {{ tab }}
        <span
        class="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
        :class="activeTab === tab ? 'bg-slate-100 text-slate-600' : 'bg-slate-200 text-slate-500'"
        >{{ tabCount(tab) }}</span>
    </button>
    </div>

    <!-- ── Filtro + búsqueda ── -->
    <div class="flex items-center gap-3">
    <div class="max-w-sm w-full">
        <SearchBar v-model="search" placeholder="Buscar por placa, marca, técnico, tipo…" />
    </div>
    </div>

    <!-- ── Tabla ── -->
    <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
    <DataTable
        :columns="columns"
        :rows="paginatedItems"
        row-key="id"
        empty-message="No hay mantenimientos para mostrar."
    >
        <!-- Vehículo -->
        <template #cell-vehiculo="{ row }">
        <div>
            <span class="font-mono font-bold tracking-widest text-xs text-slate-800">
            {{ (row as MaintenanceRecord).vehiculoPlaca }}
            </span>
            <p class="text-slate-400 text-xs mt-0.5">
            {{ (row as MaintenanceRecord).vehiculoMarca }}
            {{ (row as MaintenanceRecord).vehiculoModelo }}
            </p>
        </div>
        </template>

        <!-- Tipo -->
        <template #cell-tipo="{ row }">
        <span class="text-sm text-slate-700">{{ (row as MaintenanceRecord).tipo }}</span>
        </template>

        <!-- Técnico -->
        <template #cell-tecnico="{ row }">
        <span class="text-sm text-slate-700">{{ (row as MaintenanceRecord).tecnico }}</span>
        </template>

        <!-- Fecha ingreso -->
        <template #cell-fechaIngreso="{ row }">
        <span class="font-mono text-xs text-slate-600">
            {{ fmtDate((row as MaintenanceRecord).fechaIngreso) }}
        </span>
        </template>

        <!-- Estado -->
        <template #cell-estado="{ row }">
        <StatusBadge :status="(row as MaintenanceRecord).estado" />
        </template>

        <!-- Costo -->
        <template #cell-costo="{ row }">
        <span class="font-mono text-xs text-slate-700">
            {{ fmtCOP((row as MaintenanceRecord).costo) }}
        </span>
        </template>

        <!-- Acciones — key 'actions' igual que el ejemplo de referencia -->
        <template #cell-actions="{ row }">
        <div class="flex items-center justify-center gap-1">
            <button
            v-if="(row as MaintenanceRecord).estado === 'Abierto'"
            class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700
                    border border-amber-200 hover:bg-amber-100 transition-colors"
            @click="openCloseModal(row as MaintenanceRecord)"
            >
            Cerrar
            </button>
            <button
            v-else
            class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600
                    border border-slate-200 hover:bg-slate-100 transition-colors"
            @click="openDetail(row as MaintenanceRecord)"
            >
            Ver
            </button>
        </div>
        </template>

    <!-- Paginación -->
    <template #pagination>
        <div class="flex items-center justify-between text-sm text-slate-500">
        <span>Mostrando {{ paginatedItems.length }} de {{ filteredItems.length }} registros</span>
        <div class="flex gap-2">
            <button
            :disabled="currentPage === 1"
            class="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40
                    hover:bg-slate-100 transition-colors disabled:cursor-not-allowed"
            @click="currentPage--"
            >← Anterior</button>
            <span class="px-3 py-1 text-slate-700 font-medium">{{ currentPage }} / {{ totalPages }}</span>
            <button
            :disabled="currentPage === totalPages"
            class="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40
                    hover:bg-slate-100 transition-colors disabled:cursor-not-allowed"
            @click="currentPage++"
            >Siguiente →</button>
        </div>
        </div>
    </template>

    </DataTable>

    <!-- ══ MODAL: Abrir mantenimiento ══ -->
    <BaseModal
    :show="showOpenModal"
    title="Abrir mantenimiento"
    size="lg"
    @close="showOpenModal = false"
    >
    <div class="space-y-4">

        <!-- Error inline -->
        <div
        v-if="openError"
        class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700"
        >{{ openError }}</div>

        <!-- Vehículo -->
        <div>
        <label class="block text-slate-600 font-semibold text-xs mb-1.5">Vehículo *</label>
        <select
            v-model="openForm.vehiculoId"
            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800
                focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none"
        >
            <option value="" disabled>Selecciona un vehículo</option>
            <option
            v-for="v in eligibleVehicles"
            :key="v.id"
            :value="v.id"
            >{{ v.placa }} — {{ v.marca }} {{ v.modelo }}</option>
        </select>
        <p v-if="eligibleVehicles.length === 0" class="text-xs text-amber-700 mt-1">
            No hay vehículos disponibles para mantenimiento.
        </p>
        </div>

        <!-- Tipo -->
        <div>
        <label class="block text-slate-600 font-semibold text-xs mb-1.5">Tipo *</label>
        <select
            v-model="openForm.tipo"
            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800
                focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none"
        >
            <option v-for="t in maintenanceTypes" :key="t" :value="t">{{ t }}</option>
        </select>
        </div>

        <!-- Descripción -->
        <div>
        <label class="block text-slate-600 font-semibold text-xs mb-1.5">Descripción *</label>
        <textarea
            v-model="openForm.descripcion"
            rows="3"
            placeholder="Describe el trabajo a realizar…"
            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800
                focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none resize-none"
        />
        </div>

        <!-- Fecha ingreso + Técnico -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
            <label class="block text-slate-600 font-semibold text-xs mb-1.5">Fecha ingreso *</label>
            <input
            v-model="openForm.fechaIngreso"
            type="date"
            :max="today"
            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800
                    focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none"
            />
        </div>
        <div>
            <label class="block text-slate-600 font-semibold text-xs mb-1.5">Técnico *</label>
            <input
            v-model="openForm.tecnico"
            type="text"
            placeholder="Nombre del técnico"
            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800
                    focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none"
            />
        </div>
        </div>

        <!-- Costo -->
        <div>
        <label class="block text-slate-600 font-semibold text-xs mb-1.5">Costo estimado (COP)</label>
        <input
            v-model.number="openForm.costo"
            type="number"
            min="0"
            placeholder="0"
            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800
                focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none"
        />
        </div>
    </div>

    <template #footer>
        <button
        class="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200
                rounded-xl hover:bg-slate-50 transition-colors"
        @click="showOpenModal = false"
        >Cancelar</button>
        <button
        class="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white
                rounded-xl transition-colors"
        @click="submitOpen"
        >Abrir mantenimiento</button>
    </template>
    </BaseModal>

    <!-- ══ MODAL: Cerrar mantenimiento ══ -->
    <BaseModal
    :show="showCloseModal"
    title="Cerrar mantenimiento"
    size="lg"
    @close="showCloseModal = false"
    >
    <div class="space-y-4">

        <!-- Info del registro -->
        <div
        v-if="closingRecord"
        class="bg-slate-50 border border-slate-200 rounded-lg p-3"
        >
        <p class="text-xs text-slate-500">Vehículo</p>
        <p class="text-sm font-semibold text-slate-800 mt-0.5">
            <span class="font-mono tracking-widest">{{ closingRecord.vehiculoPlaca }}</span>
            — {{ closingRecord.vehiculoMarca }} {{ closingRecord.vehiculoModelo }}
        </p>
        <p class="text-xs text-slate-500 mt-2">Km de ingreso</p>
        <p class="text-sm font-mono text-slate-700">
            {{ new Intl.NumberFormat('es-CO').format(closingRecord.kilometrajeIngreso) }} km
        </p>
        </div>

        <!-- Error inline -->
        <div
        v-if="closeError"
        class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700"
        >{{ closeError }}</div>

        <!-- Fecha salida + Km salida -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
            <label class="block text-slate-600 font-semibold text-xs mb-1.5">Fecha salida *</label>
            <input
            v-model="closeForm.fechaSalida"
            type="date"
            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800
                    focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none"
            />
        </div>
        <div>
            <label class="block text-slate-600 font-semibold text-xs mb-1.5">Kilometraje salida *</label>
            <input
            v-model.number="closeForm.kilometrajeSalida"
            type="number"
            :min="closingRecord?.kilometrajeIngreso ?? 0"
            placeholder="km"
            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800
                    focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none"
            />
        </div>
        </div>

        <!-- Comentarios de cierre -->
        <div>
        <label class="block text-slate-600 font-semibold text-xs mb-1.5">Comentarios de cierre</label>
        <textarea
            v-model="closeForm.comentariosCierre"
            rows="3"
            placeholder="Detalla el trabajo realizado, repuestos usados, observaciones…"
            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800
                focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none resize-none"
        />
        </div>

        <!-- Próximo mantenimiento -->
        <div>
        <label class="block text-slate-600 font-semibold text-xs mb-1.5">Próximo mantenimiento</label>
        <input
            v-model="closeForm.proximoMantenimiento"
            type="date"
            :min="today"
            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800
                focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none"
        />
        <p class="text-xs text-slate-400 mt-1">Opcional. Debe ser una fecha futura.</p>
        </div>
    </div>

    <template #footer>
        <button
        class="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200
                rounded-xl hover:bg-slate-50 transition-colors"
        @click="showCloseModal = false"
        >Cancelar</button>
        <button
        class="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white
                rounded-xl transition-colors"
        @click="submitClose"
        >Cerrar mantenimiento</button>
    </template>
    </BaseModal>

    <!-- ══ MODAL: Ver detalle (solo lectura) ══ -->
    <BaseModal
    :show="showDetailModal"
    title="Detalle de mantenimiento"
    size="lg"
    @close="showDetailModal = false"
    >
    <div v-if="detailRecord" class="space-y-4">

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p class="text-xs text-slate-500 font-semibold">Vehículo</p>
            <p class="font-mono font-bold tracking-widest text-sm text-slate-800 mt-0.5">
            {{ detailRecord.vehiculoPlaca }}
            </p>
            <p class="text-xs text-slate-500">
            {{ detailRecord.vehiculoMarca }} {{ detailRecord.vehiculoModelo }}
            </p>
        </div>
        <div class="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p class="text-xs text-slate-500 font-semibold">Estado</p>
            <div class="mt-1">
            <StatusBadge :status="detailRecord.estado" />
            </div>
        </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
            <p class="text-xs text-slate-500 font-semibold">Tipo</p>
            <p class="text-sm text-slate-800 mt-0.5">{{ detailRecord.tipo }}</p>
        </div>
        <div>
            <p class="text-xs text-slate-500 font-semibold">Técnico</p>
            <p class="text-sm text-slate-800 mt-0.5">{{ detailRecord.tecnico }}</p>
        </div>
        <div>
            <p class="text-xs text-slate-500 font-semibold">Costo</p>
            <p class="text-sm font-mono text-slate-800 mt-0.5">{{ fmtCOP(detailRecord.costo) }}</p>
        </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
            <p class="text-xs text-slate-500 font-semibold">Fecha ingreso</p>
            <p class="text-sm font-mono text-slate-800 mt-0.5">{{ fmtDate(detailRecord.fechaIngreso) }}</p>
        </div>
        <div>
            <p class="text-xs text-slate-500 font-semibold">Fecha salida</p>
            <p class="text-sm font-mono text-slate-800 mt-0.5">{{ fmtDate(detailRecord.fechaSalida) }}</p>
        </div>
        <div>
            <p class="text-xs text-slate-500 font-semibold">Km ingreso</p>
            <p class="text-sm font-mono text-slate-800 mt-0.5">
            {{ new Intl.NumberFormat('es-CO').format(detailRecord.kilometrajeIngreso) }} km
            </p>
        </div>
        <div>
            <p class="text-xs text-slate-500 font-semibold">Km salida</p>
            <p class="text-sm font-mono text-slate-800 mt-0.5">
            {{ detailRecord.kilometrajeSalida != null
                ? new Intl.NumberFormat('es-CO').format(detailRecord.kilometrajeSalida) + ' km'
                : '—' }}
            </p>
        </div>
        </div>

        <div v-if="detailRecord.descripcion">
        <p class="text-xs text-slate-500 font-semibold">Descripción</p>
        <p class="text-sm text-slate-700 mt-0.5">{{ detailRecord.descripcion }}</p>
        </div>

        <div v-if="detailRecord.comentariosCierre">
        <p class="text-xs text-slate-500 font-semibold">Comentarios de cierre</p>
        <p class="text-sm text-slate-700 mt-0.5">{{ detailRecord.comentariosCierre }}</p>
        </div>

        <div v-if="detailRecord.proximoMantenimiento">
        <p class="text-xs text-slate-500 font-semibold">Próximo mantenimiento</p>
        <p class="text-sm font-mono text-slate-800 mt-0.5">
            {{ fmtDate(detailRecord.proximoMantenimiento) }}
        </p>
        </div>
    </div>

    <template #footer>
        <button
        class="px-4 py-2 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white
                rounded-xl transition-colors"
        @click="showDetailModal = false"
        >Cerrar</button>
    </template>
    </BaseModal>

</div>
</template>