<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { useVehiclesStore } from '@/stores/vehicles'
import { useAuthStore } from '@/stores/auth'
import DataTable from '@/components/ui/DataTable.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import SearchBar from '@/components/ui/SearchBar.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import type {
    Vehicle,
    VehicleFormData,
    VehicleEditFormData,
    VehicleOperationalStatus,
    VehicleAdministrativeStatus,
    VehicleType,
    DocumentLegalStatus,
} from '@/types'

const store   = useVehiclesStore()
const authStore = useAuthStore()
const currentUser = computed(() => authStore.user?.name ?? 'Sistema')

// ─── Tipos para selects ──────────────────────────────────────
const vehicleTypes: VehicleType[] = ['Camión', 'Van', 'Moto', 'Automóvil', 'Bus']

const operationalStatuses: VehicleOperationalStatus[] = [
    'Disponible', 'En ruta', 'En mantenimiento',
]
const administrativeStatuses: VehicleAdministrativeStatus[] = [
    'Activo', 'Inactivo', 'Vendido',
]

// ─── Filtros ─────────────────────────────────────────────────
type FilterOption = 'Todos' | VehicleOperationalStatus | 'Vendido'

const search       = ref('')
const filterOption = ref<FilterOption>('Todos')
const currentPage  = ref(1)
const PAGE_SIZE    = 20

// Resetear página al cambiar filtros
watch([search, filterOption], () => { currentPage.value = 1 })

const filteredVehicles = computed(() => {
    let result = store.vehicles
    if (filterOption.value === 'Vendido') {
        result = result.filter(v => v.estadoAdministrativo === 'Vendido')
    } else if (filterOption.value !== 'Todos') {
        result = result.filter(
            v =>
                v.estadoOperativo === filterOption.value &&
                v.estadoAdministrativo !== 'Vendido',
        )
    }
    if (search.value.trim()) {
        const q = search.value.trim().toUpperCase()
        result = result.filter(
            v =>
                v.placa.toUpperCase().includes(q) ||
                v.vin.toUpperCase().includes(q)  ||
                v.marca.toUpperCase().includes(q) ||
                (v.modelo && v.modelo.toUpperCase().includes(q)) ||
                (v.tipo && v.tipo.toUpperCase().includes(q)) ||
                (v.conductorAsignadoNombre && v.conductorAsignadoNombre.toUpperCase().includes(q)),
        )
    }
    return result
})

const paginatedVehicles = computed(() => {
    const start = (currentPage.value - 1) * PAGE_SIZE
    return filteredVehicles.value.slice(start, start + PAGE_SIZE)
})
const totalPages = computed(() =>
    Math.max(1, Math.ceil(filteredVehicles.value.length / PAGE_SIZE)),
)

// ─── Columnas tabla ──────────────────────────────────────────
const columns = [
    { key: 'placa',                   label: 'Placa',        width: '110px' },
    { key: 'marcaModelo',             label: 'Marca / Modelo' },
    { key: 'tipo',                    label: 'Tipo',         width: '100px' },
    { key: 'estadoOperativo',         label: 'Estado op.',   width: '140px' },
    { key: 'estadoAdministrativo',    label: 'Estado adm.',  width: '110px' },
    { key: 'soat',                    label: 'SOAT',         width: '120px' },
    { key: 'tecnomecanica',           label: 'Tecnomecánica',width: '130px' },
    { key: 'conductorAsignadoNombre', label: 'Conductor' },
    { key: 'kilometraje',             label: 'Km',           width: '110px', align: 'right' as const },
    { key: 'actions',                 label: 'Acciones',     width: '100px', align: 'center' as const },
]

// ─── Helpers ─────────────────────────────────────────────────
function formatKm(km: number): string {
    return new Intl.NumberFormat('es-CO').format(km) + ' km'
}

function formatDate(iso: string): string {
    if (!iso) return '—'
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
}

function docStatus(vehicle: Vehicle, tipo: 'SOAT' | 'TECNOMECANICA'): DocumentLegalStatus | '—' {
    const doc = vehicle.documentos.find(d => d.tipo === tipo)
    return doc ? doc.estadoLegal : '—'
}

function docVencimiento(vehicle: Vehicle, tipo: 'SOAT' | 'TECNOMECANICA'): string {
    const doc = vehicle.documentos.find(d => d.tipo === tipo)
    return doc ? formatDate(doc.fechaVencimiento) : '—'
}

// Clases de color para el estado legal de documentos (REQ-20 equivalent para vehículos)
function docBadgeClass(status: DocumentLegalStatus | '—'): string {
    if (status === 'Vencido')    return 'bg-red-100 text-red-700 border-red-200'
    if (status === 'Por vencer') return 'bg-amber-100 text-amber-700 border-amber-200'
    if (status === 'Vigente')    return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    return 'bg-slate-100 text-slate-500 border-slate-200'
}

// ─── Modal Crear ─────────────────────────────────────────────
const showCreateModal = ref(false)
const createError     = ref('')

const EMPTY_CREATE = (): VehicleFormData => ({
    vin: '', placa: '', marca: '', modelo: '',
    anio: new Date().getFullYear(), tipo: 'Camión',
    kilometraje: 0,
    soat:          { fechaExpedicion: '', fechaVencimiento: '' },
    tecnomecanica: { fechaExpedicion: '', fechaVencimiento: '' },
})

const createForm = reactive<VehicleFormData>(EMPTY_CREATE())

function openCreate() {
    Object.assign(createForm, EMPTY_CREATE())
    createForm.soat          = { fechaExpedicion: '', fechaVencimiento: '' }
    createForm.tecnomecanica = { fechaExpedicion: '', fechaVencimiento: '' }
    createError.value        = ''
    showCreateModal.value    = true
}

function formatPlacaDisplay(val: string): string {
    if (!val) return ''
    const clean = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase().substring(0, 6)
    if (clean.length > 3) {
        return clean.substring(0, 3) + '-' + clean.substring(3)
    }
    return clean
}

async function submitCreate() {
    createError.value = ''

    if (!createForm.vin || !createForm.placa || !createForm.marca || !createForm.modelo) {
        createError.value = 'Por favor completa todos los campos obligatorios.'
        return
    }

    const plateClean = createForm.placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    const plateRegex = /^[A-Z]{3}[0-9]{3}$/
    if (!plateRegex.test(plateClean)) {
        createError.value = 'La placa debe tener exactamente 3 letras seguidas de 3 números (Ej: ABC-123).'
        return
    }

    const vinClean = createForm.vin.replace(/\s/g, '').toUpperCase()
    if (vinClean.length !== 17) {
        createError.value = 'El VIN debe tener exactamente 17 caracteres.'
        return
    }

    if (!store.isPlacaUnique(plateClean)) {
        createError.value = 'Esta placa ya se encuentra registrada.'
        return
    }

    if (!store.isVinUnique(vinClean)) {
        createError.value = 'Este VIN ya se encuentra registrado.'
        return
    }

    if (createForm.kilometraje < 0) {
        createError.value = 'El kilometraje debe ser un valor positivo.'
        return
    }
    if (!createForm.soat.fechaVencimiento || !createForm.soat.fechaExpedicion) {
        createError.value = 'Ingresa las fechas del SOAT.'
        return
    }
    if (!createForm.tecnomecanica.fechaVencimiento || !createForm.tecnomecanica.fechaExpedicion) {
        createError.value = 'Ingresa las fechas de la Tecnomecánica.'
        return
    }

    const result = await store.createVehicle({ ...createForm }, currentUser.value)

    if (result.ok) {
        showCreateModal.value = false
    } else {
        createError.value = result.error ?? 'Error desconocido.'
    }
}

// ─── Modal Editar ─────────────────────────────────────────────
const showEditModal  = ref(false)
const editingVehicle = ref<Vehicle | null>(null)
const editError      = ref('')

const EMPTY_EDIT = (): VehicleEditFormData => ({
    marca: '', modelo: '', anio: new Date().getFullYear(),
    tipo: 'Camión', kilometraje: 0,
    estadoAdministrativo: 'Activo',
    soat:          { fechaExpedicion: '', fechaVencimiento: '' },
    tecnomecanica: { fechaExpedicion: '', fechaVencimiento: '' },
})

const editForm = reactive<VehicleEditFormData>(EMPTY_EDIT())

function openEdit(v: Vehicle) {
    editingVehicle.value = v
    const soatDoc  = v.documentos.find(d => d.tipo === 'SOAT')
    const tecDoc   = v.documentos.find(d => d.tipo === 'TECNOMECANICA')

    Object.assign(editForm, {
        marca:  v.marca,
        modelo: v.modelo,
        anio:   v.anio,
        tipo:   v.tipo,
        kilometraje: v.kilometraje,
        estadoAdministrativo: v.estadoAdministrativo,
        soat: {
            fechaExpedicion:  soatDoc?.fechaExpedicion  ?? '',
            fechaVencimiento: soatDoc?.fechaVencimiento ?? '',
        },
        tecnomecanica: {
            fechaExpedicion:  tecDoc?.fechaExpedicion  ?? '',
            fechaVencimiento: tecDoc?.fechaVencimiento ?? '',
        },
    })
    editError.value    = ''
    showEditModal.value = true
}

async function submitEdit() {
    editError.value = ''
    if (!editingVehicle.value) return

    if (editForm.kilometraje < 0) {
        editError.value = 'El kilometraje debe ser un valor positivo.'
        return
    }
    if (!editForm.soat.fechaVencimiento || !editForm.soat.fechaExpedicion) {
        editError.value = 'Ingresa las fechas del SOAT.'
        return
    }
    if (!editForm.tecnomecanica.fechaVencimiento || !editForm.tecnomecanica.fechaExpedicion) {
        editError.value = 'Ingresa las fechas de la Tecnomecánica.'
        return
    }

    const result = await store.updateVehicle(
        editingVehicle.value.id,
        { ...editForm },
        currentUser.value,
    )

    if (result.ok) {
        showEditModal.value = false
    } else {
        editError.value = result.error ?? 'Error desconocido.'
    }
}

// ─── Modal Vender (inactivación lógica) ──────────────────────
const showSellModal  = ref(false)
const sellTarget     = ref<Vehicle | null>(null)
const sellError      = ref('')

function openSell(v: Vehicle) {
    sellTarget.value = v
    sellError.value  = ''
    showSellModal.value = true
}

async function confirmSell() {
    if (!sellTarget.value) return
    // Para la demo se asume sin asignación/mantenimiento abierto;
    // en integración real estos flags vienen de los stores correspondientes.
    const result = await store.changeAdministrativeStatus(
        sellTarget.value.id,
        'Vendido',
        currentUser.value,
        false,  // hasOpenAssignment
        false,  // hasOpenMaintenance
    )
    if (result.ok) {
        showSellModal.value = false
        sellTarget.value    = null
        sellError.value     = ''
    } else {
        sellError.value = result.error ?? 'Error.'
    }
}

// ─── Contadores para pills ───────────────────────────────────
const countAll          = computed(() => store.vehicles.length)
const countDisponible   = computed(() => store.availableVehicles)
const countEnRuta       = computed(() => store.inRouteVehicles)
const countMantenimiento= computed(() => store.inMaintenanceVehicles)
const countVendidos     = computed(() => store.soldVehicles)

// Alertas de documentos vencidos o por vencer
const docsAlert = computed(() => {
    let vencidos = 0
    let porVencer = 0
    store.vehicles.forEach(v => {
        v.documentos.forEach(d => {
            if (d.estadoLegal === 'Vencido')    vencidos++
            if (d.estadoLegal === 'Por vencer') porVencer++
        })
    })
    return { vencidos, porVencer }
})
</script>

<template>
    <div class="p-6 space-y-6">

        <!-- ─── Header ──────────────────────────────────────────── -->
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-bold text-slate-800">Vehículos</h1>
                <p class="text-sm text-slate-500 mt-0.5">
                    {{ store.activeVehicles.length }} activos ·
                    {{ countDisponible }} disponibles ·
                    {{ countEnRuta }} en ruta ·
                    {{ countMantenimiento }} en mantenimiento
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

        <!-- ─── Alertas de documentos ────────────────────────────── -->
        <div
            v-if="docsAlert.vencidos > 0 || docsAlert.porVencer > 0"
            class="flex gap-3 flex-wrap"
        >
            <div
                v-if="docsAlert.vencidos > 0"
                class="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
            >
                <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    />
                </svg>
                <strong>{{ docsAlert.vencidos }}</strong> documento(s) vencido(s) en la flota
            </div>
            <div
                v-if="docsAlert.porVencer > 0"
                class="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700"
            >
                <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
                <strong>{{ docsAlert.porVencer }}</strong> documento(s) por vencer (&le;30 días)
            </div>
        </div>

        <!-- ─── Pills de filtro ──────────────────────────────────── -->
        <div class="flex gap-2 flex-wrap">
            <button
                v-for="[opt, label, count] in ([
                    ['Todos',            'Todos',            countAll],
                    ['Disponible',       'Disponible',       countDisponible],
                    ['En ruta',          'En ruta',          countEnRuta],
                    ['En mantenimiento', 'En mantenimiento', countMantenimiento],
                    ['Vendido',          'Vendido',          countVendidos],
                ] as [FilterOption, string, number][])"
                :key="opt"
                :class="[
                    'px-4 py-1.5 rounded-full text-sm font-medium border transition-all',
                    filterOption === opt
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300',
                ]"
                @click="filterOption = opt"
            >
                {{ label }}
                <span class="ml-1 text-xs opacity-70">({{ count }})</span>
            </button>
        </div>

        <!-- ─── Búsqueda ─────────────────────────────────────────── -->
        <div class="max-w-sm">
            <SearchBar v-model="search" placeholder="Buscar por placa, VIN o marca..." />
        </div>

        <!-- ─── Tabla ────────────────────────────────────────────── -->
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

            <!-- Marca / Modelo -->
            <template #cell-marcaModelo="{ row }">
                <div class="flex flex-col">
                    <span class="font-medium text-slate-800 text-sm">{{ (row as Vehicle).marca }}</span>
                    <span class="text-xs text-slate-400">{{ (row as Vehicle).modelo }} · {{ (row as Vehicle).anio }}</span>
                </div>
            </template>

            <!-- Estado operativo -->
            <template #cell-estadoOperativo="{ row }">
                <StatusBadge :status="(row as Vehicle).estadoOperativo" />
            </template>

            <!-- Estado administrativo -->
            <template #cell-estadoAdministrativo="{ row }">
                <StatusBadge :status="(row as Vehicle).estadoAdministrativo" />
            </template>

            <!-- SOAT -->
            <template #cell-soat="{ row }">
                <div class="flex flex-col gap-0.5">
                    <span
                        :class="['inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border w-fit',
                                docBadgeClass(docStatus(row as Vehicle, 'SOAT'))]"
                    >
                        {{ docStatus(row as Vehicle, 'SOAT') }}
                    </span>
                    <span class="text-xs text-slate-400 font-mono">
                        {{ docVencimiento(row as Vehicle, 'SOAT') }}
                    </span>
                </div>
            </template>

            <!-- Tecnomecánica -->
            <template #cell-tecnomecanica="{ row }">
                <div class="flex flex-col gap-0.5">
                    <span
                        :class="['inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border w-fit',
                                docBadgeClass(docStatus(row as Vehicle, 'TECNOMECANICA'))]"
                    >
                        {{ docStatus(row as Vehicle, 'TECNOMECANICA') }}
                    </span>
                    <span class="text-xs text-slate-400 font-mono">
                        {{ docVencimiento(row as Vehicle, 'TECNOMECANICA') }}
                    </span>
                </div>
            </template>

            <!-- Conductor -->
            <template #cell-conductorAsignadoNombre="{ row }">
                <span
                    v-if="(row as Vehicle).conductorAsignadoNombre"
                    class="text-slate-700 text-sm"
                >
                    {{ (row as Vehicle).conductorAsignadoNombre }}
                </span>
                <span v-else class="text-slate-300 italic text-xs">Sin asignar</span>
            </template>

            <!-- Kilometraje -->
            <template #cell-kilometraje="{ row }">
                <span class="font-mono text-slate-600 text-xs">
                    {{ formatKm((row as Vehicle).kilometraje) }}
                </span>
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
                        v-if="(row as Vehicle).estadoAdministrativo !== 'Vendido'"
                        class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Marcar como vendido"
                        @click="openSell(row as Vehicle)"
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
                        >← Anterior</button>
                        <span class="px-3 py-1 text-slate-700 font-medium">
                            {{ currentPage }} / {{ totalPages }}
                        </span>
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

        <!-- ══════════════════════════════════════════════════════
            MODAL CREAR VEHÍCULO
        ══════════════════════════════════════════════════════ -->
        <BaseModal
            :show="showCreateModal"
            title="Registrar nuevo vehículo"
            size="lg"
            @close="showCreateModal = false"
        >
            <form class="space-y-5" @submit.prevent="submitCreate">

                <!-- VIN + Placa -->
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                            VIN <span class="text-red-500">*</span>
                        </label>
                        <input
                            :value="createForm.vin"
                            @input="createForm.vin = ($event.target as HTMLInputElement).value.replace(/\s/g, '').toUpperCase().substring(0, 17)"
                            maxlength="17"
                            type="text"
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400
                                transition-all font-mono"
                            placeholder="1HGBH41JXMN109186"
                        />
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                            Placa <span class="text-red-500">*</span>
                        </label>
                        <input
                            :value="formatPlacaDisplay(createForm.placa)"
                            @input="createForm.placa = ($event.target as HTMLInputElement).value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().substring(0, 6)"
                            maxlength="7"
                            type="text"
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400
                                transition-all font-mono tracking-widest uppercase"
                            placeholder="ABC-123"
                        />
                    </div>
                </div>

                <!-- Marca + Modelo -->
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                            Marca <span class="text-red-500">*</span>
                        </label>
                        <input
                            v-model.trim="createForm.marca"
                            maxlength="50"
                            type="text"
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            placeholder="Toyota"
                        />
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                            Modelo <span class="text-red-500">*</span>
                        </label>
                        <input
                            v-model.trim="createForm.modelo"
                            maxlength="50"
                            type="text"
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            placeholder="Hilux"
                        />
                    </div>
                </div>

                <!-- Año + Tipo + Km -->
                <div class="grid grid-cols-3 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">Año</label>
                        <input
                            v-model.number="createForm.anio"
                            type="number" min="1990" :max="new Date().getFullYear() + 1"
                            @keypress="['-', '.', 'e', 'E'].includes($event.key) && $event.preventDefault()"
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        />
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">Tipo</label>
                        <select
                            v-model="createForm.tipo"
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        >
                            <option v-for="t in vehicleTypes" :key="t" :value="t">{{ t }}</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                            Kilometraje inicial <span class="text-red-500">*</span>
                        </label>
                        <input
                            v-model.number="createForm.kilometraje"
                            type="number" min="0"
                            @keypress="['-', '.', 'e', 'E'].includes($event.key) && $event.preventDefault()"
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        />
                    </div>
                </div>

                <!-- Estado inicial (informativo) -->
                <div class="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p class="text-xs text-blue-700">
                        <strong>Estado inicial:</strong> El vehículo se registrará automáticamente como
                        <StatusBadge status="Disponible" class="ml-1 inline-flex" />
                    </p>
                </div>

                <!-- SOAT -->
                <div class="border-t border-slate-100 pt-4">
                    <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        SOAT <span class="text-red-500">*</span>
                    </p>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Fecha de expedición</label>
                            <input
                                v-model="createForm.soat.fechaExpedicion"
                                type="date"
                                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            />
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Fecha de vencimiento</label>
                            <input
                                v-model="createForm.soat.fechaVencimiento"
                                type="date"
                                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <!-- Tecnomecánica -->
                <div class="border-t border-slate-100 pt-4">
                    <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        Tecnomecánica <span class="text-red-500">*</span>
                    </p>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Fecha de expedición</label>
                            <input
                                v-model="createForm.tecnomecanica.fechaExpedicion"
                                type="date"
                                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            />
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Fecha de vencimiento</label>
                            <input
                                v-model="createForm.tecnomecanica.fechaVencimiento"
                                type="date"
                                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <!-- Error -->
                <div v-if="createError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p class="text-sm text-red-700">{{ createError }}</p>
                </div>
            </form>

            <template #footer>
                <div class="flex justify-end gap-3">
                    <button
                        class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        @click="showCreateModal = false"
                    >Cancelar</button>
                    <button
                        class="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
                        @click="submitCreate"
                    >Registrar vehículo</button>
                </div>
            </template>
        </BaseModal>

        <!-- ══════════════════════════════════════════════════════
            MODAL EDITAR VEHÍCULO
        ══════════════════════════════════════════════════════ -->
        <BaseModal
            :show="showEditModal"
            title="Editar vehículo"
            size="lg"
            @close="showEditModal = false"
        >
            <form class="space-y-5" @submit.prevent="submitEdit">

                <!-- VIN + Placa (inmutables — REQ-10) -->
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">VIN</label>
                        <input
                            :value="editingVehicle?.vin"
                            type="text" disabled
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-100
                                text-slate-500 cursor-not-allowed font-mono"
                        />
                        <p class="mt-1 text-xs text-slate-400">El VIN no se puede modificar.</p>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">Placa</label>
                        <input
                            :value="editingVehicle?.placa"
                            type="text" disabled
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-100
                                text-slate-500 cursor-not-allowed font-mono tracking-widest"
                        />
                        <p class="mt-1 text-xs text-slate-400">La placa no se puede modificar.</p>
                    </div>
                </div>

                <!-- Marca + Modelo -->
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">Marca</label>
                        <input
                            v-model.trim="editForm.marca"
                            maxlength="50"
                            type="text"
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        />
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">Modelo</label>
                        <input
                            v-model.trim="editForm.modelo"
                            maxlength="50"
                            type="text"
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        />
                    </div>
                </div>

                <!-- Año + Tipo + Km -->
                <div class="grid grid-cols-3 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">Año</label>
                        <input
                            v-model.number="editForm.anio"
                            type="number" min="1990" :max="new Date().getFullYear() + 1"
                            @keypress="['-', '.', 'e', 'E'].includes($event.key) && $event.preventDefault()"
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        />
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">Tipo</label>
                        <select
                            v-model="editForm.tipo"
                            disabled
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-100
                                text-slate-500 cursor-not-allowed focus:outline-none transition-all"
                        >
                            <option v-for="t in vehicleTypes" :key="t" :value="t">{{ t }}</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">Kilometraje</label>
                        <input
                            v-model.number="editForm.kilometraje"
                            type="number" min="0"
                            @keypress="['-', '.', 'e', 'E'].includes($event.key) && $event.preventDefault()"
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        />
                    </div>
                </div>

                <!-- Estado administrativo (REQ-11: no si tiene asignación/mantenimiento abierto) -->
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1.5">Estado administrativo</label>
                    <select
                        v-model="editForm.estadoAdministrativo"
                        class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                            focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                    >
                        <option v-for="s in administrativeStatuses" :key="s" :value="s">{{ s }}</option>
                    </select>
                    <p v-if="editingVehicle?.conductorAsignadoId" class="mt-1 text-xs text-amber-600">
                        ⚠ Este vehículo tiene un conductor asignado. Cierra la asignación antes de cambiarlo a Inactivo o Vendido.
                    </p>
                </div>

                <!-- SOAT -->
                <div class="border-t border-slate-100 pt-4">
                    <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">SOAT</p>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Fecha de expedición</label>
                            <input
                                v-model="editForm.soat.fechaExpedicion"
                                type="date"
                                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            />
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Fecha de vencimiento</label>
                            <input
                                v-model="editForm.soat.fechaVencimiento"
                                type="date"
                                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <!-- Tecnomecánica -->
                <div class="border-t border-slate-100 pt-4">
                    <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Tecnomecánica</p>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Fecha de expedición</label>
                            <input
                                v-model="editForm.tecnomecanica.fechaExpedicion"
                                type="date"
                                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            />
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Fecha de vencimiento</label>
                            <input
                                v-model="editForm.tecnomecanica.fechaVencimiento"
                                type="date"
                                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <!-- Error -->
                <div v-if="editError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p class="text-sm text-red-700">{{ editError }}</p>
                </div>
            </form>

            <template #footer>
                <div class="flex justify-end gap-3">
                    <button
                        class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        @click="showEditModal = false"
                    >Cancelar</button>
                    <button
                        class="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
                        @click="submitEdit"
                    >Guardar cambios</button>
                </div>
            </template>
        </BaseModal>

        <!-- ══════════════════════════════════════════════════════
            MODAL CONFIRMAR VENTA (REQ-14 / REQ-15)
        ══════════════════════════════════════════════════════ -->
        <BaseModal
            :show="showSellModal"
            title="Marcar como vendido"
            size="sm"
            @close="showSellModal = false"
        >
            <div class="space-y-4">
                <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p class="text-sm text-amber-800">
                        ¿Confirmas marcar el vehículo
                        <strong>{{ sellTarget?.placa }}</strong>
                        ({{ sellTarget?.marca }} {{ sellTarget?.modelo }}) como
                        <strong>Vendido</strong>?
                        Quedará retirado operativamente.
                    </p>
                </div>
                <p class="text-xs text-slate-500">
                    El registro se conservará en el sistema (no se elimina físicamente).
                </p>
                <div v-if="sellError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p class="text-sm text-red-700">{{ sellError }}</p>
                </div>
            </div>

            <template #footer>
                <div class="flex justify-end gap-3">
                    <button
                        class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        @click="showSellModal = false; sellError = ''"
                    >Cancelar</button>
                    <button
                        class="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        @click="confirmSell"
                    >Sí, marcar como vendido</button>
                </div>
            </template>
        </BaseModal>

    </div>
</template>