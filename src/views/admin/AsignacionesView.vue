<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useAssignmentsStore } from '@/stores/assignments'
import { useVehiclesStore }    from '@/stores/vehicles'
import { useDriversStore }     from '@/stores/drivers'
import DataTable   from '@/components/ui/DataTable.vue'
import BaseModal   from '@/components/ui/BaseModal.vue'
import SearchBar   from '@/components/ui/SearchBar.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import type { Assignment, AssignmentFormData, AssignmentCloseData } from '@/types'

const assignmentsStore = useAssignmentsStore()
const vehiclesStore    = useVehiclesStore()
const driversStore     = useDriversStore()

// ── Tabs ────────────────────────────────────────────────────
const activeTab = ref<'activas' | 'historial'>('activas')

// ── Búsqueda ────────────────────────────────────────────────
const search = ref('')

function matchSearch(a: Assignment) {
    if (!search.value.trim()) return true
    const q = search.value.toLowerCase()
    return (
        a.vehiculoPlaca.toLowerCase().includes(q) ||
        a.conductorNombre.toLowerCase().includes(q) ||
        a.vehiculoMarca.toLowerCase().includes(q)
    )
}

const filteredActivas   = computed(() => assignmentsStore.activas.filter(matchSearch))
const filteredHistorial = computed(() => assignmentsStore.historial.filter(matchSearch))

// ── Columnas ────────────────────────────────────────────────
const columnsActivas = [
    { key: 'vehiculo',   label: 'Vehículo' },
    { key: 'conductor',  label: 'Conductor' },
    { key: 'fechaInicio',label: 'Inicio', width: '160px' },
    { key: 'kmInicio',   label: 'Km inicio', width: '110px', align: 'right' as const },
    { key: 'responsable',label: 'Responsable', width: '130px' },
    { key: 'actions',    label: 'Acciones', width: '100px', align: 'center' as const },
]

const columnsHistorial = [
    { key: 'vehiculo',   label: 'Vehículo' },
    { key: 'conductor',  label: 'Conductor' },
    { key: 'fechaInicio',label: 'Inicio', width: '145px' },
    { key: 'fechaFin',   label: 'Fin', width: '145px' },
    { key: 'kmInicio',   label: 'Km inicio', width: '100px', align: 'right' as const },
    { key: 'kmFin',      label: 'Km fin',    width: '100px', align: 'right' as const },
    { key: 'duracion',   label: 'Duración',  width: '110px', align: 'center' as const },
    { key: 'responsable',label: 'Responsable', width: '120px' },
]

// ── Helpers de formato ───────────────────────────────────────
function fmtDateTime(iso: string | null): string {
    if (!iso) return '—'
    return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso))
}

function fmtKm(km: number | null): string {
    if (km === null) return '—'
    return new Intl.NumberFormat('es-CO').format(km) + ' km'
}

function duracion(inicio: string, fin: string | null): string {
    if (!fin) return '—'
    const ms = new Date(fin).getTime() - new Date(inicio).getTime()
    const h  = Math.floor(ms / 3600000)
    const m  = Math.floor((ms % 3600000) / 60000)
    return `${h}h ${m}m`
}

function fmtDate(iso: string): string {
    return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
        .format(new Date(iso))
}

// ── Selects para el modal ────────────────────────────────────
const vehiculosDisponibles = computed(() =>
    vehiclesStore.vehicles.filter(v => v.estado === 'Disponible')
)
const conductoresActivos = computed(() =>
    driversStore.drivers.filter(d => d.estado === 'Activo' && d.estadoLegal !== 'Vencida')
)

// ── Modal Nueva Asignación ───────────────────────────────────
const showFormModal = ref(false)
const formError     = ref('')

const form = reactive<AssignmentFormData>({
    vehiculoId: '', conductorId: '', usuarioResponsable: 'Admin',
})

// Alertas inline de documentos por vencer
const vehiculoSeleccionado = computed(() =>
    vehiclesStore.vehicles.find(v => v.id === form.vehiculoId) ?? null
)
const conductorSeleccionado = computed(() =>
    driversStore.drivers.find(d => d.id === form.conductorId) ?? null
)

function alertasVehiculo(): string[] {
    const v = vehiculoSeleccionado.value
    if (!v) return []
    const alerts: string[] = []
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    const soat = new Date(v.fechaVencimientoSoat)
    const tecno = new Date(v.fechaVencimientoTecnomecanica)
    const diff = (d: Date) => Math.ceil((d.getTime() - hoy.getTime()) / 86400000)

    if (diff(soat) <= 30 && diff(soat) >= 0)
        alerts.push(`⚠ SOAT vence en ${diff(soat)} día(s) (${fmtDate(v.fechaVencimientoSoat)})`)
    if (diff(tecno) <= 30 && diff(tecno) >= 0)
        alerts.push(`⚠ Tecnomecánica vence en ${diff(tecno)} día(s) (${fmtDate(v.fechaVencimientoTecnomecanica)})`)
    return alerts
}

function alertasConductor(): string[] {
    const d = conductorSeleccionado.value
    if (!d) return []
    if (d.estadoLegal === 'Por vencer') {
        const hoy = new Date(); hoy.setHours(0,0,0,0)
        const vence = new Date(d.fechaVencimientoLicencia)
        const dias = Math.ceil((vence.getTime() - hoy.getTime()) / 86400000)
        return [`⚠ Licencia ${d.tipoLicencia} vence en ${dias} día(s) (${fmtDate(d.fechaVencimientoLicencia)})`]
    }
    return []
}

function openCreate() {
    form.vehiculoId = ''; form.conductorId = ''; form.usuarioResponsable = 'Admin'
    formError.value = ''
    showFormModal.value = true
}

function submitForm() {
    formError.value = ''
    if (!form.vehiculoId || !form.conductorId) {
        formError.value = 'Selecciona un vehículo y un conductor.'
        return
    }
    const result = assignmentsStore.createAssignment({ ...form })
    if (result.success) {
        showFormModal.value = false
    } else {
        formError.value = result.error ?? 'Error desconocido.'
    }
}

// ── Modal Finalizar Asignación ───────────────────────────────
const showCloseModal   = ref(false)
const closingTarget    = ref<Assignment | null>(null)
const closeError       = ref('')
const closeForm        = reactive<AssignmentCloseData>({ fechaFin: '', kilometrajeFin: 0 })

function openClose(a: Assignment) {
    closingTarget.value  = a
    closeError.value     = ''
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    closeForm.fechaFin   = now.toISOString().slice(0, 16)
    const v = vehiclesStore.vehicles.find(v => v.id === a.vehiculoId)
    closeForm.kilometrajeFin = v?.kilometraje ?? a.kilometrajeInicio
    showCloseModal.value = true
}

function submitClose() {
    closeError.value = ''
    if (!closeForm.fechaFin || closeForm.kilometrajeFin === null) {
        closeError.value = 'Completa la fecha y el kilometraje final.'
        return
    }
    if (!closingTarget.value) return
    const result = assignmentsStore.closeAssignment(closingTarget.value.id, { ...closeForm })
    if (result.success) {
        showCloseModal.value = false
    } else {
        closeError.value = result.error ?? 'Error.'
    }
}

const kmMinimoActual = computed(() => {
    if (!closingTarget.value) return 0
    return vehiclesStore.vehicles.find(v => v.id === closingTarget.value!.vehiculoId)?.kilometraje ?? 0
})
</script>

<template>
    <div class="p-6 space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
        <div>
            <h1 class="text-2xl font-bold text-slate-800">Asignaciones</h1>
            <p class="text-sm text-slate-500 mt-0.5">
            {{ assignmentsStore.activas.length }} activas ·
            {{ assignmentsStore.historial.length }} en historial
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
            Nueva asignación
        </button>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
            v-for="tab in [{ key: 'activas', label: 'Activas', count: assignmentsStore.activas.length },
                        { key: 'historial', label: 'Historial', count: assignmentsStore.historial.length }]"
            :key="tab.key"
            :class="[
            'px-5 py-2 text-sm font-medium rounded-lg transition-all',
            activeTab === tab.key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            ]"
            @click="activeTab = tab.key as 'activas' | 'historial'"
        >
            {{ tab.label }}
            <span :class="['ml-2 text-xs px-1.5 py-0.5 rounded-full',
            activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500']">
            {{ tab.count }}
            </span>
        </button>
        </div>

        <!-- Búsqueda -->
        <div class="max-w-sm">
        <SearchBar v-model="search" placeholder="Buscar por placa, conductor o marca..." />
        </div>

        <!-- Tabla Activas -->
        <DataTable
        v-if="activeTab === 'activas'"
        :columns="columnsActivas"
        :rows="filteredActivas"
        row-key="id"
        empty-message="No hay asignaciones activas."
        >
        <template #cell-vehiculo="{ row }">
            <div>
            <span class="font-mono font-bold text-xs tracking-widest text-slate-800">
                {{ (row as Assignment).vehiculoPlaca }}
            </span>
            <p class="text-xs text-slate-400">{{ (row as Assignment).vehiculoMarca }} {{ (row as Assignment).vehiculoModelo }}</p>
            </div>
        </template>

        <template #cell-conductor="{ row }">
            <div>
            <span class="font-medium text-slate-700">{{ (row as Assignment).conductorNombre }}</span>
            <p class="text-xs text-slate-400 font-mono">{{ (row as Assignment).conductorCedula }}</p>
            </div>
        </template>

        <template #cell-fechaInicio="{ row }">
            <span class="text-xs text-slate-600">{{ fmtDateTime((row as Assignment).fechaInicio) }}</span>
        </template>

        <template #cell-kmInicio="{ row }">
            <span class="font-mono text-xs text-slate-600">{{ fmtKm((row as Assignment).kilometrajeInicio) }}</span>
        </template>

        <template #cell-responsable="{ row }">
            <span class="text-xs text-slate-600">{{ (row as Assignment).usuarioResponsable }}</span>
        </template>

        <template #cell-actions="{ row }">
            <div class="flex justify-center">
            <button
                class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-50
                    text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                @click="openClose(row as Assignment)"
            >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
                Finalizar
            </button>
            </div>
        </template>
        </DataTable>

        <!-- Tabla Historial -->
        <DataTable
        v-if="activeTab === 'historial'"
        :columns="columnsHistorial"
        :rows="filteredHistorial"
        row-key="id"
        empty-message="No hay asignaciones finalizadas."
        >
        <template #cell-vehiculo="{ row }">
            <div>
            <span class="font-mono font-bold text-xs tracking-widest text-slate-800">
                {{ (row as Assignment).vehiculoPlaca }}
            </span>
            <p class="text-xs text-slate-400">{{ (row as Assignment).vehiculoMarca }} {{ (row as Assignment).vehiculoModelo }}</p>
            </div>
        </template>

        <template #cell-conductor="{ row }">
            <span class="font-medium text-slate-700">{{ (row as Assignment).conductorNombre }}</span>
        </template>

        <template #cell-fechaInicio="{ row }">
            <span class="text-xs text-slate-600">{{ fmtDateTime((row as Assignment).fechaInicio) }}</span>
        </template>

        <template #cell-fechaFin="{ row }">
            <span class="text-xs text-slate-600">{{ fmtDateTime((row as Assignment).fechaFin) }}</span>
        </template>

        <template #cell-kmInicio="{ row }">
            <span class="font-mono text-xs text-slate-600">{{ fmtKm((row as Assignment).kilometrajeInicio) }}</span>
        </template>

        <template #cell-kmFin="{ row }">
            <span class="font-mono text-xs text-slate-600">{{ fmtKm((row as Assignment).kilometrajeFin) }}</span>
        </template>

        <template #cell-duracion="{ row }">
            <span class="text-xs text-slate-600">
            {{ duracion((row as Assignment).fechaInicio, (row as Assignment).fechaFin) }}
            </span>
        </template>

        <template #cell-responsable="{ row }">
            <span class="text-xs text-slate-600">{{ (row as Assignment).usuarioResponsable }}</span>
        </template>
        </DataTable>

        <!-- ── Modal Nueva Asignación ─────────────────────────── -->
        <BaseModal :show="showFormModal" title="Nueva asignación" size="md" @close="showFormModal = false">
        <div class="space-y-5">
            <!-- Vehículo -->
            <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                Vehículo disponible <span class="text-red-500">*</span>
            </label>
            <select
                v-model="form.vehiculoId"
                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
            >
                <option value="">Selecciona un vehículo...</option>
                <option v-for="v in vehiculosDisponibles" :key="v.id" :value="v.id">
                {{ v.placa }} — {{ v.marca }} {{ v.modelo }} ({{ new Intl.NumberFormat('es-CO').format(v.kilometraje) }} km)
                </option>
            </select>
            <!-- Alertas inline del vehículo -->
            <div v-if="alertasVehiculo().length" class="mt-2 space-y-1">
                <p v-for="alerta in alertasVehiculo()" :key="alerta"
                class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                {{ alerta }}
                </p>
            </div>
            <p v-else-if="vehiculoSeleccionado" class="mt-1.5 text-xs text-emerald-600">
                ✓ Documentación vigente
            </p>
            </div>

            <!-- Conductor -->
            <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                Conductor activo <span class="text-red-500">*</span>
            </label>
            <select
                v-model="form.conductorId"
                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
            >
                <option value="">Selecciona un conductor...</option>
                <option v-for="d in conductoresActivos" :key="d.id" :value="d.id">
                {{ d.nombre }} — Lic. {{ d.tipoLicencia }}
                {{ d.estadoLegal === 'Por vencer' ? '⚠' : '✓' }}
                </option>
            </select>
            <!-- Alertas inline del conductor -->
            <div v-if="alertasConductor().length" class="mt-2 space-y-1">
                <p v-for="alerta in alertasConductor()" :key="alerta"
                class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                {{ alerta }}
                </p>
            </div>
            <p v-else-if="conductorSeleccionado" class="mt-1.5 text-xs text-emerald-600">
                ✓ Licencia vigente
            </p>
            </div>

            <!-- Responsable -->
            <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Usuario responsable</label>
            <input
                v-model="form.usuarioResponsable"
                type="text"
                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
            />
            </div>

            <!-- Info de validación -->
            <div class="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500 space-y-1">
            <p class="font-semibold text-slate-600">Validaciones automáticas al confirmar:</p>
            <p>• Vehículo en estado Disponible con SOAT y Tecnomecánica vigentes</p>
            <p>• Conductor Activo con licencia Vigente</p>
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
            >Confirmar asignación</button>
            </div>
        </template>
        </BaseModal>

        <!-- ── Modal Finalizar Asignación ─────────────────────── -->
        <BaseModal :show="showCloseModal" title="Finalizar asignación" size="sm" @close="showCloseModal = false">
        <div class="space-y-4">
            <div v-if="closingTarget" class="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
            <p class="font-semibold text-slate-700">
                {{ closingTarget.vehiculoPlaca }} — {{ closingTarget.conductorNombre }}
            </p>
            <p class="text-xs text-slate-400 mt-0.5">
                Inicio: {{ fmtDateTime(closingTarget.fechaInicio) }}
            </p>
            </div>

            <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                Fecha y hora de llegada <span class="text-red-500">*</span>
            </label>
            <input
                v-model="closeForm.fechaFin"
                type="datetime-local"
                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
            />
            </div>

            <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                Kilometraje final <span class="text-red-500">*</span>
            </label>
            <input
                v-model.number="closeForm.kilometrajeFin"
                type="number"
                :min="kmMinimoActual"
                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
            />
            <p class="mt-1 text-xs text-slate-400">
                Mínimo: {{ new Intl.NumberFormat('es-CO').format(kmMinimoActual) }} km (km actual del vehículo)
            </p>
            </div>

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
            >Registrar llegada</button>
            </div>
        </template>
        </BaseModal>
    </div>
</template>