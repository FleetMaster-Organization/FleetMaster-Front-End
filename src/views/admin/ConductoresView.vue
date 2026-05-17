<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { useDriversStore } from '@/stores/drivers'
import { useAuthStore } from '@/stores/auth'
import DataTable from '@/components/ui/DataTable.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import SearchBar from '@/components/ui/SearchBar.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import type {
    Driver,
    DriverFormData,
    DriverEditFormData,
    DriverEmploymentStatus,
    DriverEmploymentSubstatus,
    LicenseCategory,
    LicenseStatusLegal,
} from '@/types'

const store     = useDriversStore()
const authStore = useAuthStore()
const currentUser = computed(() => authStore.user?.name ?? 'Sistema')

// ─── Catálogos ────────────────────────────────────────────────
const licenseCategories: LicenseCategory[] = ['A1', 'A2', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3']

/** Subestados disponibles según el estadoLaboral seleccionado */
const substatusMap: Record<DriverEmploymentStatus, DriverEmploymentSubstatus[]> = {
    ACTIVO:   ['ACTIVO'],
    INACTIVO: ['SUSPENDIDO', 'VACACIONES', 'INCAPACIDAD'],
    RETIRADO: ['DESPEDIDO', 'RENUNCIA'],
}

/** Etiquetas legibles para subestados */
const substatusLabels: Record<DriverEmploymentSubstatus, string> = {
    ACTIVO:      'Activo',
    SUSPENDIDO:  'Suspendido',
    VACACIONES:  'Vacaciones',
    INCAPACIDAD: 'Incapacidad',
    DESPEDIDO:   'Despedido',
    RENUNCIA:    'Renuncia',
}

// ─── Filtros ─────────────────────────────────────────────────
type FilterOption = 'Todos' | DriverEmploymentStatus | 'ConAlerta'
const search       = ref('')
const filterOption = ref<FilterOption>('Todos')
const currentPage  = ref(1)
const PAGE_SIZE    = 20

watch([search, filterOption], () => { currentPage.value = 1 })

const filteredDrivers = computed(() => {
    let result = store.drivers

    if (filterOption.value === 'ConAlerta') {
        result = result.filter(d =>
            d.licencias.some(l => l.estadoLegal !== 'Vigente'),
        )
    } else if (filterOption.value !== 'Todos') {
        result = result.filter(d => d.estadoLaboral === filterOption.value)
    }

    if (search.value.trim()) {
        const q = search.value.trim().toLowerCase()
        result = result.filter(
            d =>
                d.nombre.toLowerCase().includes(q) ||
                d.cedula.includes(q),
        )
    }
    return result
})

const paginatedDrivers = computed(() => {
    const start = (currentPage.value - 1) * PAGE_SIZE
    return filteredDrivers.value.slice(start, start + PAGE_SIZE)
})
const totalPages = computed(() =>
    Math.max(1, Math.ceil(filteredDrivers.value.length / PAGE_SIZE)),
)

// ─── Columnas ────────────────────────────────────────────────
const columns = [
    { key: 'nombre',                  label: 'Nombre' },
    { key: 'cedula',                  label: 'Cédula',         width: '130px' },
    { key: 'telefono',                label: 'Teléfono',       width: '120px' },
    { key: 'estadoLaboral',           label: 'Estado',         width: '130px' },
    { key: 'licencias',               label: 'Licencias',      width: '220px' },
    { key: 'vehiculoAsignadoPlaca',   label: 'Vehículo',       width: '110px' },
    { key: 'actions',                 label: 'Acciones',       width: '110px', align: 'center' as const },
]

// ─── Helpers UI ───────────────────────────────────────────────
function licenseBadgeClass(status: LicenseStatusLegal): string {
    if (status === 'Vencida')    return 'bg-red-100 text-red-700 border-red-200'
    if (status === 'Por vencer') return 'bg-amber-100 text-amber-700 border-amber-200'
    return 'bg-emerald-100 text-emerald-700 border-emerald-200'
}

function formatDate(iso: string): string {
    if (!iso) return '—'
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
}

/** Peor estado de licencia del conductor (para el indicador en la columna Nombre) */
function worstLicenseStatus(d: Driver): LicenseStatusLegal | null {
    if (d.licencias.some(l => l.estadoLegal === 'Vencida'))    return 'Vencida'
    if (d.licencias.some(l => l.estadoLegal === 'Por vencer')) return 'Por vencer'
    return null
}

// ─── Contadores de alerta ────────────────────────────────────
const countVencidas   = computed(() =>
    store.drivers.filter(d => d.licencias.some(l => l.estadoLegal === 'Vencida')).length,
)
const countPorVencer  = computed(() =>
    store.drivers.filter(
        d => !d.licencias.some(l => l.estadoLegal === 'Vencida') &&
              d.licencias.some(l => l.estadoLegal === 'Por vencer'),
    ).length,
)

// ─── Form helpers: licencias dinámicas ───────────────────────
interface LicenseRow {
    categoria: LicenseCategory
    fechaExpedicion: string
    fechaVencimiento: string
}

interface ContactRow {
    id?: string
    nombre: string
    telefono: string
    relacion: string
}

function emptyLicense(): LicenseRow {
    return { categoria: 'B1', fechaExpedicion: '', fechaVencimiento: '' }
}
function emptyContact(): ContactRow {
    return { nombre: '', telefono: '', relacion: '' }
}

// ─── Modal Crear ─────────────────────────────────────────────
const showCreateModal = ref(false)
const createError     = ref('')

interface CreateForm {
    nombre: string
    cedula: string
    telefono: string
    email: string
    estadoLaboral: DriverEmploymentStatus
    subestadoLaboral: DriverEmploymentSubstatus
    licencias: LicenseRow[]
    contactosEmergencia: ContactRow[]
}

const createForm = reactive<CreateForm>({
    nombre: '', cedula: '', telefono: '', email: '',
    estadoLaboral: 'ACTIVO', subestadoLaboral: 'ACTIVO',
    licencias: [emptyLicense()],
    contactosEmergencia: [emptyContact()],
})

// Al cambiar estado, ajustar subestado automáticamente
watch(() => createForm.estadoLaboral, (val) => {
    createForm.subestadoLaboral = substatusMap[val][0]!
})

function openCreate() {
    Object.assign(createForm, {
        nombre: '', cedula: '', telefono: '', email: '',
        estadoLaboral: 'ACTIVO', subestadoLaboral: 'ACTIVO',
    })
    createForm.licencias           = [emptyLicense()]
    createForm.contactosEmergencia = [emptyContact()]
    createError.value              = ''
    showCreateModal.value          = true
}

function addLicense()  { createForm.licencias.push(emptyLicense()) }
function removeLicense(i: number) {
    if (createForm.licencias.length > 1) createForm.licencias.splice(i, 1)
}
function addContact()  { createForm.contactosEmergencia.push(emptyContact()) }
function removeContact(i: number) {
    if (createForm.contactosEmergencia.length > 1)
        createForm.contactosEmergencia.splice(i, 1)
}

function submitCreate() {
    createError.value = ''
    if (!createForm.nombre || !createForm.cedula) {
        createError.value = 'Nombre y cédula son obligatorios.'
        return
    }
    if (createForm.licencias.some(l => !l.fechaExpedicion || !l.fechaVencimiento)) {
        createError.value = 'Completa las fechas de todas las licencias.'
        return
    }
    if (createForm.contactosEmergencia.some(c => !c.nombre || !c.telefono)) {
        createError.value = 'Completa nombre y teléfono de todos los contactos de emergencia.'
        return
    }

    const payload: DriverFormData = {
        nombre:            createForm.nombre,
        cedula:            createForm.cedula,
        telefono:          createForm.telefono,
        email:             createForm.email,
        estadoLaboral:     createForm.estadoLaboral,
        subestadoLaboral:  createForm.subestadoLaboral,
        licencias:         createForm.licencias.map(l => ({
            categoria:        l.categoria,
            fechaExpedicion:  l.fechaExpedicion,
            fechaVencimiento: l.fechaVencimiento,
        })),
        contactosEmergencia: createForm.contactosEmergencia.map(c => ({
            nombre:   c.nombre,
            telefono: c.telefono,
            relacion: c.relacion || undefined,
        })),
    }

    const result = store.createDriver(payload, currentUser.value)
    if (result.ok) {
        showCreateModal.value = false
    } else {
        createError.value = result.error ?? 'Error desconocido.'
    }
}

// ─── Modal Editar ─────────────────────────────────────────────
const showEditModal  = ref(false)
const editingDriver  = ref<Driver | null>(null)
const editError      = ref('')

interface EditForm {
    nombre: string
    telefono: string
    email: string
    estadoLaboral: DriverEmploymentStatus
    subestadoLaboral: DriverEmploymentSubstatus
    licencias: Array<LicenseRow & { id?: string }>
    contactosEmergencia: ContactRow[]
}

const editForm = reactive<EditForm>({
    nombre: '', telefono: '', email: '',
    estadoLaboral: 'ACTIVO', subestadoLaboral: 'ACTIVO',
    licencias: [],
    contactosEmergencia: [],
})

watch(() => editForm.estadoLaboral, (val) => {
    if (!substatusMap[val].includes(editForm.subestadoLaboral)) {
        editForm.subestadoLaboral = substatusMap[val][0]!
    }
})

function openEdit(d: Driver) {
    editingDriver.value = d
    Object.assign(editForm, {
        nombre:           d.nombre,
        telefono:         d.telefono,
        email:            d.email,
        estadoLaboral:    d.estadoLaboral,
        subestadoLaboral: d.subestadoLaboral,
    })
    editForm.licencias = d.licencias.map(l => ({
        id:               l.id,
        categoria:        l.categoria,
        fechaExpedicion:  l.fechaExpedicion,
        fechaVencimiento: l.fechaVencimiento,
    }))
    editForm.contactosEmergencia = d.contactosEmergencia.map(c => ({
        id:       c.id,
        nombre:   c.nombre,
        telefono: c.telefono,
        relacion: c.relacion ?? '',
    }))
    editError.value    = ''
    showEditModal.value = true
}

function addEditLicense()  { editForm.licencias.push(emptyLicense()) }
function removeEditLicense(i: number) {
    if (editForm.licencias.length > 1) editForm.licencias.splice(i, 1)
}
function addEditContact()  { editForm.contactosEmergencia.push(emptyContact()) }
function removeEditContact(i: number) {
    if (editForm.contactosEmergencia.length > 1)
        editForm.contactosEmergencia.splice(i, 1)
}

function submitEdit() {
    editError.value = ''
    if (!editingDriver.value) return
    if (!editForm.nombre) {
        editError.value = 'El nombre es obligatorio.'
        return
    }
    if (editForm.licencias.some(l => !l.fechaExpedicion || !l.fechaVencimiento)) {
        editError.value = 'Completa las fechas de todas las licencias.'
        return
    }
    if (editForm.contactosEmergencia.some(c => !c.nombre || !c.telefono)) {
        editError.value = 'Completa nombre y teléfono de todos los contactos de emergencia.'
        return
    }

    const payload: DriverEditFormData = {
        nombre:           editForm.nombre,
        telefono:         editForm.telefono,
        email:            editForm.email,
        estadoLaboral:    editForm.estadoLaboral,
        subestadoLaboral: editForm.subestadoLaboral,
        licencias:        editForm.licencias.map(l => ({
            id:               l.id,
            categoria:        l.categoria,
            fechaExpedicion:  l.fechaExpedicion,
            fechaVencimiento: l.fechaVencimiento,
        })),
        contactosEmergencia: editForm.contactosEmergencia.map(c => ({
            id:       c.id,
            nombre:   c.nombre,
            telefono: c.telefono,
            relacion: c.relacion || undefined,
        })),
    }

    const result = store.updateDriver(editingDriver.value.id, payload, currentUser.value)
    if (result.ok) {
        showEditModal.value = false
    } else {
        editError.value = result.error ?? 'Error desconocido.'
    }
}

// ─── Modal Confirmación (inactivar / activar) ─────────────────
const showConfirmModal  = ref(false)
const confirmTarget     = ref<Driver | null>(null)
const confirmMode       = ref<'deactivate' | 'activate'>('deactivate')
const confirmSubstatus  = ref<DriverEmploymentSubstatus>('SUSPENDIDO')
const confirmError      = ref('')

function openConfirmDeactivate(d: Driver) {
    confirmTarget.value    = d
    confirmMode.value      = 'deactivate'
    confirmSubstatus.value = 'SUSPENDIDO'
    confirmError.value     = ''
    showConfirmModal.value = true
}

function openConfirmActivate(d: Driver) {
    confirmTarget.value    = d
    confirmMode.value      = 'activate'
    confirmError.value     = ''
    showConfirmModal.value = true
}

function doConfirmAction() {
    if (!confirmTarget.value) return
    const result = confirmMode.value === 'deactivate'
        ? store.inactivateDriver(confirmTarget.value.id, confirmSubstatus.value, currentUser.value)
        : store.activateDriver(confirmTarget.value.id, currentUser.value)

    if (result.ok) {
        showConfirmModal.value = false
        confirmTarget.value    = null
        confirmError.value     = ''
    } else {
        confirmError.value = result.error ?? 'Error.'
    }
}
</script>

<template>
    <div class="p-6 space-y-6">

        <!-- ─── Header ──────────────────────────────────────────── -->
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-bold text-slate-800">Conductores</h1>
                <p class="text-sm text-slate-500 mt-0.5">
                    {{ store.totalDrivers }} en total ·
                    {{ store.activeDriversCount }} activos ·
                    {{ store.availableDrivers.length }} disponibles
                    <span v-if="countVencidas > 0" class="text-red-600 font-medium">
                        · {{ countVencidas }} con licencia vencida
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

        <!-- ─── Alertas de licencias (REQ-20) ───────────────────── -->
        <div v-if="countVencidas > 0 || countPorVencer > 0" class="flex gap-3 flex-wrap">
            <div
                v-if="countVencidas > 0"
                class="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
            >
                <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    />
                </svg>
                <strong>{{ countVencidas }}</strong> conductor(es) con al menos una licencia vencida
            </div>
            <div
                v-if="countPorVencer > 0"
                class="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700"
            >
                <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <strong>{{ countPorVencer }}</strong> conductor(es) con licencia por vencer (&le;30 días)
            </div>
        </div>

        <!-- ─── Pills de filtro ──────────────────────────────────── -->
        <div class="flex gap-2 flex-wrap">
            <button
                v-for="[opt, label] in ([
                    ['Todos',    'Todos'],
                    ['ACTIVO',   'Activos'],
                    ['INACTIVO', 'Inactivos'],
                    ['RETIRADO', 'Retirados'],
                    ['ConAlerta','Con alerta de licencia'],
                ] as [FilterOption, string][])"
                :key="opt"
                :class="[
                    'px-4 py-1.5 rounded-full text-sm font-medium border transition-all',
                    filterOption === opt
                        ? opt === 'ConAlerta'
                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                            : 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300',
                ]"
                @click="filterOption = opt"
            >
                {{ label }}
            </button>
        </div>

        <!-- ─── Búsqueda ─────────────────────────────────────────── -->
        <div class="max-w-sm">
            <SearchBar v-model="search" placeholder="Buscar por nombre o cédula..." />
        </div>

        <!-- ─── Tabla ────────────────────────────────────────────── -->
        <DataTable
            :columns="columns"
            :rows="paginatedDrivers"
            row-key="id"
            empty-message="No se encontraron conductores con los filtros actuales."
        >
            <!-- Nombre con indicador de alerta (REQ-20) -->
            <template #cell-nombre="{ row }">
                <div class="flex items-center gap-2">
                    <span
                        v-if="worstLicenseStatus(row as Driver) === 'Vencida'"
                        class="w-2 h-2 rounded-full bg-red-500 shrink-0"
                        title="Licencia vencida"
                    />
                    <span
                        v-else-if="worstLicenseStatus(row as Driver) === 'Por vencer'"
                        class="w-2 h-2 rounded-full bg-amber-500 shrink-0"
                        title="Licencia por vencer"
                    />
                    <div class="flex flex-col">
                        <span class="font-medium text-slate-800 text-sm">{{ (row as Driver).nombre }}</span>
                        <span class="text-xs text-slate-400">{{ substatusLabels[(row as Driver).subestadoLaboral] }}</span>
                    </div>
                </div>
            </template>

            <!-- Cédula -->
            <template #cell-cedula="{ row }">
                <span class="font-mono text-xs text-slate-600">{{ (row as Driver).cedula }}</span>
            </template>

            <!-- Teléfono -->
            <template #cell-telefono="{ row }">
                <span class="text-sm text-slate-600">{{ (row as Driver).telefono || '—' }}</span>
            </template>

            <!-- Estado laboral -->
            <template #cell-estadoLaboral="{ row }">
                <StatusBadge :status="(row as Driver).estadoLaboral" />
            </template>

            <!-- Licencias: chips por categoría con su estado (REQ-20) -->
            <template #cell-licencias="{ row }">
                <div class="flex flex-wrap gap-1">
                    <span
                        v-for="lic in (row as Driver).licencias"
                        :key="lic.id"
                        :class="['inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border',
                                licenseBadgeClass(lic.estadoLegal)]"
                        :title="`${lic.categoria} · Vence: ${formatDate(lic.fechaVencimiento)}`"
                    >
                        {{ lic.categoria }}
                        <span
                            v-if="lic.estadoLegal !== 'Vigente'"
                            class="opacity-70 text-[10px]"
                        >
                            {{ lic.estadoLegal === 'Vencida' ? '✕' : '!' }}
                        </span>
                    </span>
                    <span v-if="!(row as Driver).licencias.length" class="text-slate-300 italic text-xs">
                        Sin licencias
                    </span>
                </div>
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
                    <button
                        v-if="(row as Driver).estadoLaboral !== 'INACTIVO' && (row as Driver).estadoLaboral !== 'RETIRADO'"
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
                    <button
                        v-if="(row as Driver).estadoLaboral === 'INACTIVO'"
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
                        >← Anterior</button>
                        <span class="px-3 py-1 text-slate-700 font-medium">{{ currentPage }} / {{ totalPages }}</span>
                        <button
                            :disabled="currentPage === totalPages"
                            class="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-colors disabled:cursor-not-allowed"
                            @click="currentPage++"
                        >Siguiente →</button>
                    </div>
                </div>
            </template>
        </DataTable>

        <!-- ══════════════════════════════════════════════════════
            MODAL CREAR CONDUCTOR
        ══════════════════════════════════════════════════════ -->
        <BaseModal
            :show="showCreateModal"
            title="Registrar nuevo conductor"
            size="lg"
            @close="showCreateModal = false"
        >
            <form class="space-y-5" @submit.prevent="submitCreate">

                <!-- Nombre -->
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                        Nombre completo <span class="text-red-500">*</span>
                    </label>
                    <input
                        v-model="createForm.nombre"
                        type="text"
                        class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                            focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        placeholder="Diomedes Díaz"
                    />
                </div>

                <!-- Cédula + Teléfono -->
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                            Cédula <span class="text-red-500">*</span>
                        </label>
                        <input
                            v-model="createForm.cedula"
                            type="text"
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400
                                transition-all font-mono"
                            placeholder="10445231890"
                        />
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">Teléfono</label>
                        <input
                            v-model="createForm.telefono"
                            type="tel"
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            placeholder="3201234567"
                        />
                    </div>
                </div>

                <!-- Email -->
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1.5">Correo electrónico</label>
                    <input
                        v-model="createForm.email"
                        type="email"
                        class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                            focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        placeholder="conductor@empresa.com"
                    />
                </div>

                <!-- Estado laboral + subestado -->
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">Estado laboral</label>
                        <select
                            v-model="createForm.estadoLaboral"
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        >
                            <option value="ACTIVO">Activo</option>
                            <option value="INACTIVO">Inactivo</option>
                            <option value="RETIRADO">Retirado</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">Subestado</label>
                        <select
                            v-model="createForm.subestadoLaboral"
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        >
                            <option
                                v-for="sub in substatusMap[createForm.estadoLaboral]"
                                :key="sub" :value="sub"
                            >
                                {{ substatusLabels[sub] }}
                            </option>
                        </select>
                    </div>
                </div>

                <!-- Licencias (múltiples) -->
                <div class="border-t border-slate-100 pt-4">
                    <div class="flex items-center justify-between mb-3">
                        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Categorías de licencia <span class="text-red-500">*</span>
                        </p>
                        <button
                            type="button"
                            class="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                            @click="addLicense"
                        >
                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Agregar categoría
                        </button>
                    </div>
                    <div
                        v-for="(lic, i) in createForm.licencias"
                        :key="i"
                        class="grid grid-cols-[100px_1fr_1fr_32px] gap-3 items-end mb-3"
                    >
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Categoría</label>
                            <select
                                v-model="lic.categoria"
                                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            >
                                <option v-for="c in licenseCategories" :key="c" :value="c">{{ c }}</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Fecha expedición</label>
                            <input
                                v-model="lic.fechaExpedicion"
                                type="date"
                                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            />
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Fecha vencimiento</label>
                            <input
                                v-model="lic.fechaVencimiento"
                                type="date"
                                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            />
                        </div>
                        <button
                            v-if="createForm.licencias.length > 1"
                            type="button"
                            class="p-1.5 text-slate-300 hover:text-red-500 transition-colors self-end mb-0.5"
                            @click="removeLicense(i)"
                        >
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <div v-else />
                    </div>
                </div>

                <!-- Contactos de emergencia (múltiples) -->
                <div class="border-t border-slate-100 pt-4">
                    <div class="flex items-center justify-between mb-3">
                        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Contactos de emergencia <span class="text-red-500">*</span>
                        </p>
                        <button
                            type="button"
                            class="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                            @click="addContact"
                        >
                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Agregar contacto
                        </button>
                    </div>
                    <div
                        v-for="(contact, i) in createForm.contactosEmergencia"
                        :key="i"
                        class="grid grid-cols-[1fr_130px_130px_32px] gap-3 items-end mb-3"
                    >
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Nombre</label>
                            <input
                                v-model="contact.nombre"
                                type="text"
                                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                placeholder="Rosa Díaz"
                            />
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Teléfono</label>
                            <input
                                v-model="contact.telefono"
                                type="tel"
                                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                placeholder="3109876543"
                            />
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Relación</label>
                            <input
                                v-model="contact.relacion"
                                type="text"
                                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                placeholder="Esposa"
                            />
                        </div>
                        <button
                            v-if="createForm.contactosEmergencia.length > 1"
                            type="button"
                            class="p-1.5 text-slate-300 hover:text-red-500 transition-colors self-end mb-0.5"
                            @click="removeContact(i)"
                        >
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <div v-else />
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
                    >Registrar conductor</button>
                </div>
            </template>
        </BaseModal>

        <!-- ══════════════════════════════════════════════════════
            MODAL EDITAR CONDUCTOR
        ══════════════════════════════════════════════════════ -->
        <BaseModal
            :show="showEditModal"
            title="Editar conductor"
            size="lg"
            @close="showEditModal = false"
        >
            <form class="space-y-5" @submit.prevent="submitEdit">

                <!-- Nombre -->
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                        Nombre completo <span class="text-red-500">*</span>
                    </label>
                    <input
                        v-model="editForm.nombre"
                        type="text"
                        class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                            focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                    />
                </div>

                <!-- Cédula (inmutable — REQ-19) + Teléfono -->
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">Cédula</label>
                        <input
                            :value="editingDriver?.cedula"
                            type="text" disabled
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-100
                                text-slate-500 cursor-not-allowed font-mono"
                        />
                        <p class="mt-1 text-xs text-slate-400">La cédula no se puede modificar.</p>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">Teléfono</label>
                        <input
                            v-model="editForm.telefono"
                            type="tel"
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        />
                    </div>
                </div>

                <!-- Email -->
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1.5">Correo electrónico</label>
                    <input
                        v-model="editForm.email"
                        type="email"
                        class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                            focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                    />
                </div>

                <!-- Estado laboral + subestado -->
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">Estado laboral</label>
                        <select
                            v-model="editForm.estadoLaboral"
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        >
                            <option value="ACTIVO">Activo</option>
                            <option value="INACTIVO">Inactivo</option>
                            <option value="RETIRADO">Retirado</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">Subestado</label>
                        <select
                            v-model="editForm.subestadoLaboral"
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        >
                            <option
                                v-for="sub in substatusMap[editForm.estadoLaboral]"
                                :key="sub" :value="sub"
                            >
                                {{ substatusLabels[sub] }}
                            </option>
                        </select>
                    </div>
                </div>

                <!-- Licencias (renovación/adición) -->
                <div class="border-t border-slate-100 pt-4">
                    <div class="flex items-center justify-between mb-3">
                        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Categorías de licencia
                        </p>
                        <button
                            type="button"
                            class="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                            @click="addEditLicense"
                        >
                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Agregar categoría
                        </button>
                    </div>
                    <div
                        v-for="(lic, i) in editForm.licencias"
                        :key="i"
                        class="grid grid-cols-[100px_1fr_1fr_32px] gap-3 items-end mb-3"
                    >
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Categoría</label>
                            <select
                                v-model="lic.categoria"
                                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            >
                                <option v-for="c in licenseCategories" :key="c" :value="c">{{ c }}</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Fecha expedición</label>
                            <input
                                v-model="lic.fechaExpedicion"
                                type="date"
                                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            />
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Fecha vencimiento</label>
                            <input
                                v-model="lic.fechaVencimiento"
                                type="date"
                                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            />
                        </div>
                        <button
                            v-if="editForm.licencias.length > 1"
                            type="button"
                            class="p-1.5 text-slate-300 hover:text-red-500 transition-colors self-end mb-0.5"
                            @click="removeEditLicense(i)"
                        >
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <div v-else />
                    </div>
                </div>

                <!-- Contactos de emergencia -->
                <div class="border-t border-slate-100 pt-4">
                    <div class="flex items-center justify-between mb-3">
                        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Contactos de emergencia
                        </p>
                        <button
                            type="button"
                            class="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                            @click="addEditContact"
                        >
                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Agregar contacto
                        </button>
                    </div>
                    <div
                        v-for="(contact, i) in editForm.contactosEmergencia"
                        :key="i"
                        class="grid grid-cols-[1fr_130px_130px_32px] gap-3 items-end mb-3"
                    >
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Nombre</label>
                            <input
                                v-model="contact.nombre"
                                type="text"
                                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            />
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Teléfono</label>
                            <input
                                v-model="contact.telefono"
                                type="tel"
                                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            />
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Relación</label>
                            <input
                                v-model="contact.relacion"
                                type="text"
                                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            />
                        </div>
                        <button
                            v-if="editForm.contactosEmergencia.length > 1"
                            type="button"
                            class="p-1.5 text-slate-300 hover:text-red-500 transition-colors self-end mb-0.5"
                            @click="removeEditContact(i)"
                        >
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <div v-else />
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
            MODAL CONFIRMACIÓN (inactivar / activar)
        ══════════════════════════════════════════════════════ -->
        <BaseModal
            :show="showConfirmModal"
            :title="confirmMode === 'deactivate' ? 'Inactivar conductor' : 'Activar conductor'"
            size="sm"
            @close="showConfirmModal = false"
        >
            <div class="space-y-4">
                <div
                    :class="[
                        'p-3 rounded-lg border text-sm',
                        confirmMode === 'deactivate'
                            ? 'bg-amber-50 border-amber-200 text-amber-800'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-800',
                    ]"
                >
                    <p v-if="confirmMode === 'deactivate'">
                        ¿Inactivar a <strong>{{ confirmTarget?.nombre }}</strong>?
                        No podrá participar en nuevas asignaciones operativas.
                    </p>
                    <p v-else>
                        ¿Activar a <strong>{{ confirmTarget?.nombre }}</strong>?
                        Quedará disponible para nuevas asignaciones.
                    </p>
                </div>

                <!-- Selector de subestado al inactivar -->
                <div v-if="confirmMode === 'deactivate'">
                    <label class="block text-xs font-semibold text-slate-600 mb-1.5">Motivo de inactivación</label>
                    <select
                        v-model="confirmSubstatus"
                        class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                            focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                    >
                        <option value="SUSPENDIDO">Suspendido</option>
                        <option value="VACACIONES">Vacaciones</option>
                        <option value="INCAPACIDAD">Incapacidad</option>
                        <option value="DESPEDIDO">Despedido (Retirado)</option>
                        <option value="RENUNCIA">Renuncia (Retirado)</option>
                    </select>
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
                    >Cancelar</button>
                    <button
                        :class="[
                            'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
                            confirmMode === 'deactivate'
                                ? 'bg-amber-500 hover:bg-amber-600'
                                : 'bg-emerald-600 hover:bg-emerald-700',
                        ]"
                        @click="doConfirmAction"
                    >
                        {{ confirmMode === 'deactivate' ? 'Sí, inactivar' : 'Sí, activar' }}
                    </button>
                </div>
            </template>
        </BaseModal>

    </div>
</template>