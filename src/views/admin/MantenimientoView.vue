<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useMaintenanceStore } from '@/stores/maintenance'
import { useVehiclesStore }    from '@/stores/vehicles'
import DataTable   from '@/components/ui/DataTable.vue'
import BaseModal   from '@/components/ui/BaseModal.vue'
import SearchBar   from '@/components/ui/SearchBar.vue'
import type { MaintenanceRecord, MaintenanceFormData, MaintenanceCloseData, MaintenanceType } from '@/types'

const maintenanceStore = useMaintenanceStore()
const vehiclesStore    = useVehiclesStore()

// ── Tabs ──────────────────────────────────────────────────────
const activeTab = ref<'taller' | 'historial'>('taller')

// ── Búsqueda ──────────────────────────────────────────────────
const search = ref('')

function matchSearch(r: MaintenanceRecord): boolean {
    if (!search.value.trim()) return true
    const q = search.value.toLowerCase()
    return (
        r.vehiculoPlaca.toLowerCase().includes(q) ||
        r.vehiculoMarca.toLowerCase().includes(q) ||
        r.tecnico.toLowerCase().includes(q)
    )
}

const filteredTaller    = computed(() => maintenanceStore.abiertos.filter(matchSearch))
const filteredHistorial = computed(() => maintenanceStore.cerrados.filter(matchSearch))

// ── Columnas ──────────────────────────────────────────────────
const columnsTaller = [
    { key: 'vehiculo',     label: 'Vehículo' },
    { key: 'tipo',         label: 'Tipo',       width: '110px' },
    { key: 'fechaIngreso', label: 'Ingreso',    width: '110px' },
    { key: 'kmIngreso',    label: 'Km ingreso', width: '120px', align: 'right' as const },
    { key: 'tecnico',      label: 'Técnico',    width: '150px' },
    { key: 'costo',        label: 'Costo',      width: '140px', align: 'right' as const },
    { key: 'actions',      label: 'Acciones',   width: '100px', align: 'center' as const },
]

const columnsHistorial = [
    { key: 'vehiculo',     label: 'Vehículo' },
    { key: 'tipo',         label: 'Tipo',         width: '110px' },
    { key: 'fechaIngreso', label: 'Ingreso',      width: '105px' },
    { key: 'fechaSalida',  label: 'Salida',       width: '105px' },
    { key: 'kmIngreso',    label: 'Km ingreso',   width: '110px', align: 'right' as const },
    { key: 'kmSalida',     label: 'Km salida',    width: '110px', align: 'right' as const },
    { key: 'costo',        label: 'Costo',        width: '140px', align: 'right' as const },
    { key: 'proximoMant',  label: 'Próx. mant.',  width: '130px' },
    { key: 'tecnico',      label: 'Técnico',      width: '130px' },
]

// ── Helpers ───────────────────────────────────────────────────
function formatPlacaDisplay(val: string): string {
    if (!val) return ''
    const clean = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase().substring(0, 6)
    if (clean.length > 3) {
        return clean.substring(0, 3) + '-' + clean.substring(3)
    }
    return clean
}

function fmtDate(iso: string | null): string {
    if (!iso) return '—'
    return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(new Date(iso + 'T12:00:00'))
}

function fmtKm(km: number | null): string {
    if (km === null) return '—'
    return new Intl.NumberFormat('es-CO').format(km) + ' km'
}

function fmtCOP(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', minimumFractionDigits: 0,
    }).format(valor)
}

function todayStr(): string {
    return new Date().toISOString().split('T')[0]!
}

const maintenanceTypes: MaintenanceType[] = ['Preventivo', 'Correctivo', 'Revisión']

const typeBadgeClass: Record<MaintenanceType, string> = {
    Preventivo: 'bg-blue-50 text-blue-700 border-blue-200',
    Correctivo: 'bg-red-50 text-red-700 border-red-200',
    Revisión:   'bg-slate-100 text-slate-600 border-slate-200',
}

// ── Vehículos elegibles ───────────────────────────────────────
/**
 * Elegibles para abrir mantenimiento:
 * - estadoAdministrativo !== 'Vendido'  (antes era estado !== 'Vendido')
 * - Sin mantenimiento ya abierto
 * - estadoOperativo !== 'En ruta' (tiene asignación activa)
 */
const vehiculosElegibles = computed(() =>
    vehiclesStore.vehicles.filter(v => {
        if (v.estadoAdministrativo === 'Vendido') return false
        if (v.estadoOperativo === 'En ruta') return false
        if (maintenanceStore.abiertos.some(r => r.vehiculoId === v.id)) return false
        return true
    }),
)

// ── Modal Abrir Mantenimiento ─────────────────────────────────
const showFormModal = ref(false)
const formError     = ref('')

const EMPTY_FORM = (): MaintenanceFormData => ({
    vehiculoId: '', tipo: 'Preventivo', descripcion: '',
    fechaIngreso: todayStr(), costo: 0, tecnico: '',
})

const form = reactive<MaintenanceFormData>(EMPTY_FORM())

function openCreate() {
    Object.assign(form, EMPTY_FORM())
    formError.value    = ''
    showFormModal.value = true
}

async function submitForm() {
    formError.value = ''
    if (!form.vehiculoId || !form.descripcion || !form.tecnico) {
        formError.value = 'Completa todos los campos obligatorios.'
        return
    }
    const result = await maintenanceStore.openMaintenance({ ...form })
    if (result.success) {
        showFormModal.value = false
    } else {
        formError.value = result.error ?? 'Error desconocido.'
    }
}

// ── Modal Cerrar Mantenimiento ────────────────────────────────
const showCloseModal = ref(false)
const closingTarget  = ref<MaintenanceRecord | null>(null)
const closeError     = ref('')

const closeForm = reactive<MaintenanceCloseData>({
    fechaSalida: '', kilometrajeSalida: 0,
    comentariosCierre: '', proximoMantenimiento: '',
})

function openClose(r: MaintenanceRecord) {
    closingTarget.value              = r
    closeError.value                 = ''
    closeForm.fechaSalida            = todayStr()
    closeForm.kilometrajeSalida      = r.kilometrajeIngreso
    closeForm.comentariosCierre      = ''
    closeForm.proximoMantenimiento   = ''
    showCloseModal.value             = true
}

async function submitClose() {
    closeError.value = ''
    if (!closeForm.fechaSalida || !closeForm.kilometrajeSalida) {
        closeError.value = 'La fecha de salida y el kilometraje son obligatorios.'
        return
    }
    if (!closingTarget.value) return
    const result = await maintenanceStore.closeMaintenance(closingTarget.value.id, {
        fechaSalida:          closeForm.fechaSalida,
        kilometrajeSalida:    closeForm.kilometrajeSalida,
        comentariosCierre:    closeForm.comentariosCierre    || undefined,
        proximoMantenimiento: closeForm.proximoMantenimiento || undefined,
    })
    if (result.success) {
        showCloseModal.value = false
        closingTarget.value  = null
    } else {
        closeError.value = result.error ?? 'Error.'
    }
}

// Vehículo del registro que se está cerrando (para mostrar info)
const vehiculoCierre = computed(() =>
    closingTarget.value
        ? vehiclesStore.vehicles.find(v => v.id === closingTarget.value!.vehiculoId) ?? null
        : null,
)
</script>

<template>
    <div class="p-6 space-y-6">

        <!-- ─── Header ──────────────────────────────────────────── -->
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-bold text-slate-800">Mantenimiento</h1>
                <p class="text-sm text-slate-500 mt-0.5">
                    {{ maintenanceStore.abiertos.length }} en taller ·
                    {{ maintenanceStore.cerrados.length }} en historial
                </p>
            </div>
            <button
                class="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700
                    text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
                @click="openCreate"
            >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
                Abrir mantenimiento
            </button>
        </div>

        <!-- ─── Tabs ─────────────────────────────────────────────── -->
        <div class="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
            <button
                v-for="tab in ([
                    { key: 'taller',    label: 'En taller', count: maintenanceStore.abiertos.length },
                    { key: 'historial', label: 'Historial', count: maintenanceStore.cerrados.length },
                ] as { key: 'taller' | 'historial'; label: string; count: number }[])"
                :key="tab.key"
                :class="[
                    'px-5 py-2 text-sm font-medium rounded-lg transition-all',
                    activeTab === tab.key
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700',
                ]"
                @click="activeTab = tab.key"
            >
                {{ tab.label }}
                <span :class="['ml-2 text-xs px-1.5 py-0.5 rounded-full',
                    activeTab === tab.key
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-200 text-slate-500']">
                    {{ tab.count }}
                </span>
            </button>
        </div>

        <!-- ─── Búsqueda ─────────────────────────────────────────── -->
        <div class="max-w-sm">
            <SearchBar v-model="search" placeholder="Buscar por placa, marca o técnico..." />
        </div>

        <!-- ─── Tabla En Taller ──────────────────────────────────── -->
        <DataTable
            v-if="activeTab === 'taller'"
            :columns="columnsTaller"
            :rows="filteredTaller"
            row-key="id"
            empty-message="No hay vehículos en taller actualmente."
        >
            <template #cell-vehiculo="{ row }">
                <div>
                    <span class="font-mono font-bold text-xs tracking-widest text-slate-800">
                        {{ formatPlacaDisplay((row as MaintenanceRecord).vehiculoPlaca) }}
                    </span>
                    <p class="text-xs text-slate-400">
                        {{ (row as MaintenanceRecord).vehiculoMarca }}
                        {{ (row as MaintenanceRecord).vehiculoModelo }}
                    </p>
                    <p
                        class="text-xs text-slate-400 mt-0.5 truncate max-w-50"
                        :title="(row as MaintenanceRecord).descripcion"
                    >
                        {{ (row as MaintenanceRecord).descripcion }}
                    </p>
                </div>
            </template>

            <template #cell-tipo="{ row }">
                <span :class="['inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                            typeBadgeClass[(row as MaintenanceRecord).tipo]]">
                    {{ (row as MaintenanceRecord).tipo }}
                </span>
            </template>

            <template #cell-fechaIngreso="{ row }">
                <span class="text-xs text-slate-600">
                    {{ fmtDate((row as MaintenanceRecord).fechaIngreso) }}
                </span>
            </template>

            <template #cell-kmIngreso="{ row }">
                <span class="font-mono text-xs text-slate-600">
                    {{ fmtKm((row as MaintenanceRecord).kilometrajeIngreso) }}
                </span>
            </template>

            <template #cell-tecnico="{ row }">
                <span class="text-xs text-slate-600">{{ (row as MaintenanceRecord).tecnico }}</span>
            </template>

            <template #cell-costo="{ row }">
                <span class="font-mono text-xs font-semibold text-slate-700">
                    {{ fmtCOP((row as MaintenanceRecord).costo) }}
                </span>
            </template>

            <template #cell-actions="{ row }">
                <div class="flex justify-center">
                    <button
                        class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                            bg-emerald-50 text-emerald-700 border border-emerald-200
                            rounded-lg hover:bg-emerald-100 transition-colors"
                        @click="openClose(row as MaintenanceRecord)"
                    >
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                        </svg>
                        Cerrar
                    </button>
                </div>
            </template>
        </DataTable>

        <!-- ─── Tabla Historial ──────────────────────────────────── -->
        <DataTable
            v-if="activeTab === 'historial'"
            :columns="columnsHistorial"
            :rows="filteredHistorial"
            row-key="id"
            empty-message="No hay registros de mantenimiento cerrados."
        >
            <template #cell-vehiculo="{ row }">
                <div>
                    <span class="font-mono font-bold text-xs tracking-widest text-slate-800">
                        {{ formatPlacaDisplay((row as MaintenanceRecord).vehiculoPlaca) }}
                    </span>
                    <p class="text-xs text-slate-400">
                        {{ (row as MaintenanceRecord).vehiculoMarca }}
                        {{ (row as MaintenanceRecord).vehiculoModelo }}
                    </p>
                </div>
            </template>

            <template #cell-tipo="{ row }">
                <span :class="['inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                            typeBadgeClass[(row as MaintenanceRecord).tipo]]">
                    {{ (row as MaintenanceRecord).tipo }}
                </span>
            </template>

            <template #cell-fechaIngreso="{ row }">
                <span class="text-xs text-slate-600">
                    {{ fmtDate((row as MaintenanceRecord).fechaIngreso) }}
                </span>
            </template>

            <template #cell-fechaSalida="{ row }">
                <span class="text-xs text-slate-600">
                    {{ fmtDate((row as MaintenanceRecord).fechaSalida) }}
                </span>
            </template>

            <template #cell-kmIngreso="{ row }">
                <span class="font-mono text-xs text-slate-600">
                    {{ fmtKm((row as MaintenanceRecord).kilometrajeIngreso) }}
                </span>
            </template>

            <template #cell-kmSalida="{ row }">
                <span class="font-mono text-xs text-slate-600">
                    {{ fmtKm((row as MaintenanceRecord).kilometrajeSalida) }}
                </span>
            </template>

            <template #cell-costo="{ row }">
                <span class="font-mono text-xs font-semibold text-slate-700">
                    {{ fmtCOP((row as MaintenanceRecord).costo) }}
                </span>
            </template>

            <template #cell-proximoMant="{ row }">
                <span
                    v-if="(row as MaintenanceRecord).proximoMantenimiento"
                    class="text-xs text-blue-600 font-medium"
                >
                    {{ fmtDate((row as MaintenanceRecord).proximoMantenimiento) }}
                </span>
                <span v-else class="text-xs text-slate-300 italic">No programado</span>
            </template>

            <template #cell-tecnico="{ row }">
                <span class="text-xs text-slate-600">{{ (row as MaintenanceRecord).tecnico }}</span>
            </template>
        </DataTable>

        <!-- ══════════════════════════════════════════════════════
            MODAL ABRIR MANTENIMIENTO
        ══════════════════════════════════════════════════════ -->
        <BaseModal
            :show="showFormModal"
            title="Abrir registro de mantenimiento"
            size="lg"
            @close="showFormModal = false"
        >
            <div class="space-y-4">

                <!-- Vehículo -->
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                        Vehículo <span class="text-red-500">*</span>
                    </label>
                    <select
                        v-model="form.vehiculoId"
                        class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                            focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                    >
                        <option value="">Selecciona un vehículo...</option>
                        <option v-for="v in vehiculosElegibles" :key="v.id" :value="v.id">
                            {{ formatPlacaDisplay(v.placa) }} — {{ v.marca }} {{ v.modelo }}
                            ({{ v.estadoOperativo }})
                        </option>
                    </select>
                    <p v-if="vehiculosElegibles.length === 0" class="mt-1 text-xs text-amber-600">
                        No hay vehículos disponibles para ingresar a taller.
                    </p>
                </div>

                <!-- Tipo + Fecha ingreso -->
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">Tipo</label>
                        <select
                            v-model="form.tipo"
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        >
                            <option v-for="t in maintenanceTypes" :key="t" :value="t">{{ t }}</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                            Fecha de ingreso <span class="text-red-500">*</span>
                        </label>
                        <input
                            v-model="form.fechaIngreso"
                            type="date"
                            :max="todayStr()"
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        />
                    </div>
                </div>

                <!-- Descripción -->
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                        Descripción del trabajo <span class="text-red-500">*</span>
                    </label>
                    <textarea
                        v-model="form.descripcion"
                        rows="2"
                        class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white resize-none
                            focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        placeholder="Ej: Cambio de aceite y filtros, revisión de frenos..."
                    />
                </div>

                <!-- Costo + Técnico -->
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                            Costo estimado (COP)
                        </label>
                        <input
                            v-model.number="form.costo"
                            type="number" min="0" step="1000"
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        />
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                            Técnico responsable <span class="text-red-500">*</span>
                        </label>
                        <input
                            v-model="form.tecnico"
                            type="text"
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            placeholder="Técnico Juan"
                        />
                    </div>
                </div>

                <!-- Aviso de cambio de estado -->
                <div class="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
                    Al abrir este registro, el vehículo cambiará automáticamente a estado
                    <strong>En mantenimiento</strong> y quedará bloqueado para nuevas asignaciones.
                </div>

                <!-- Error -->
                <div v-if="formError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p class="text-sm text-red-700">{{ formError }}</p>
                </div>
            </div>

            <template #footer>
                <div class="flex justify-end gap-3">
                    <button
                        class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        @click="showFormModal = false"
                    >Cancelar</button>
                    <button
                        class="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
                        @click="submitForm"
                    >Abrir registro</button>
                </div>
            </template>
        </BaseModal>

        <!-- ══════════════════════════════════════════════════════
            MODAL CERRAR MANTENIMIENTO
        ══════════════════════════════════════════════════════ -->
        <BaseModal
            :show="showCloseModal"
            title="Cerrar registro de mantenimiento"
            size="md"
            @close="showCloseModal = false"
        >
            <div class="space-y-4">

                <!-- Resumen del registro -->
                <div
                    v-if="closingTarget"
                    class="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                >
                    <p class="font-semibold text-slate-700">
                        {{ formatPlacaDisplay(closingTarget.vehiculoPlaca) }} —
                        {{ closingTarget.vehiculoMarca }} {{ closingTarget.vehiculoModelo }}
                    </p>
                    <p class="text-xs text-slate-400 mt-0.5">
                        Ingreso: {{ fmtDate(closingTarget.fechaIngreso) }} ·
                        Técnico: {{ closingTarget.tecnico }}
                    </p>
                    <p class="text-xs text-slate-400 mt-0.5 italic">
                        {{ closingTarget.descripcion }}
                    </p>
                </div>

                <!-- Fecha salida + km salida -->
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                            Fecha de salida <span class="text-red-500">*</span>
                        </label>
                        <input
                            v-model="closeForm.fechaSalida"
                            type="date"
                            :max="todayStr()"
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        />
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                            Km de salida <span class="text-red-500">*</span>
                        </label>
                        <input
                            v-model.number="closeForm.kilometrajeSalida"
                            type="number"
                            :min="closingTarget?.kilometrajeIngreso ?? 0"
                            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                                focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        />
                        <p v-if="closingTarget" class="mt-1 text-xs text-slate-400">
                            Mínimo: {{ new Intl.NumberFormat('es-CO').format(closingTarget.kilometrajeIngreso) }} km
                        </p>
                    </div>
                </div>

                <!-- Comentarios de cierre -->
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                        Comentarios de cierre
                    </label>
                    <textarea
                        v-model="closeForm.comentariosCierre"
                        rows="2"
                        class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white resize-none
                            focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        placeholder="Trabajo realizado, observaciones, recomendaciones..."
                    />
                </div>

                <!-- Próximo mantenimiento (opcional, solo informativo) -->
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                        Próximo mantenimiento programado
                        <span class="text-slate-400 font-normal">(opcional — solo informativo)</span>
                    </label>
                    <input
                        v-model="closeForm.proximoMantenimiento"
                        type="date"
                        :min="todayStr()"
                        class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                            focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                    />
                    <p class="mt-1 text-xs text-slate-400">
                        Esta fecha no cambia el estado operativo del vehículo.
                    </p>
                </div>

                <!-- Documentos del vehículo al cerrar (referencia rápida) -->
                <div v-if="vehiculoCierre" class="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <p class="text-xs font-semibold text-slate-500 mb-2">Estado de documentos del vehículo</p>
                    <div class="flex gap-2 flex-wrap">
                        <span
                            v-for="doc in vehiculoCierre.documentos"
                            :key="doc.tipo"
                            :class="[
                                'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
                                doc.estadoLegal === 'Vencido'    ? 'bg-red-100 text-red-700 border-red-200'
                                : doc.estadoLegal === 'Por vencer' ? 'bg-amber-100 text-amber-700 border-amber-200'
                                : 'bg-emerald-100 text-emerald-700 border-emerald-200',
                            ]"
                        >
                            {{ doc.tipo === 'SOAT' ? 'SOAT' : (doc.tipo === 'TARJETA_PROPIEDAD' ? 'Tarjeta de propiedad' : 'Tecnomecánica') }}
                            · {{ doc.estadoLegal }}
                        </span>
                    </div>
                </div>

                <!-- Error -->
                <div v-if="closeError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p class="text-sm text-red-700">{{ closeError }}</p>
                </div>
            </div>

            <template #footer>
                <div class="flex justify-end gap-3">
                    <button
                        class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        @click="showCloseModal = false"
                    >Cancelar</button>
                    <button
                        class="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm"
                        @click="submitClose"
                    >Cerrar y liberar vehículo</button>
                </div>
            </template>
        </BaseModal>

    </div>
</template>