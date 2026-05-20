<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import SearchBar from '@/components/ui/SearchBar.vue'
import DataTable from '@/components/ui/DataTable.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

import { useAssignmentsStore } from '@/stores/assignments'
import { useVehiclesStore } from '@/stores/vehicles'
import { useDriversStore } from '@/stores/drivers'
import { useAuthStore } from '@/stores/auth'

import type {
    Assignment,
    AssignmentFormData,
    AssignmentCloseData,
    Vehicle,
    Driver,
} from '@/types'

// ─── Stores ──────────────────────────────────────────────────
const assignmentsStore = useAssignmentsStore()
const vehiclesStore    = useVehiclesStore()
const driversStore     = useDriversStore()
const authStore        = useAuthStore()

// ─── Search & filters ────────────────────────────────────────
const search       = ref('')
const filterStatus = ref<'Todas' | 'Activa' | 'Finalizada'>('Todas')

// ─── Pagination ──────────────────────────────────────────────
const PAGE_SIZE   = 20
const currentPage = ref(1)

watch([search, filterStatus], () => { currentPage.value = 1 })

// ─── Table columns ───────────────────────────────────────────
const columns = [
    { key: 'vehiculo',    label: 'Vehículo' },
    { key: 'conductor',   label: 'Conductor' },
    { key: 'fechaInicio', label: 'Fecha inicio', width: '140px' },
    { key: 'estado',      label: 'Estado',       width: '140px' },
    { key: 'acciones',    label: '',             width: '100px', align: 'right' as const },
]

// ─── Create modal ────────────────────────────────────────────
const showCreateModal = ref(false)
const formError       = ref('')

const form = reactive<AssignmentFormData>({
    vehiculoId:          '',
    conductorId:         '',
    usuarioResponsable:  authStore.user?.name ?? 'Coordinador',
})

// ─── Close modal ─────────────────────────────────────────────
const showCloseModal  = ref(false)
const closingAssignment = ref<Assignment | null>(null)
const closeError      = ref('')

const closeForm = reactive<AssignmentCloseData>({
    fechaFin:       '',
    kilometrajeFin: 0,
})

// ─── Computed — stats ────────────────────────────────────────
const totalAssignments     = computed(() => assignmentsStore.historial.length)
const activeAssignments    = computed(() => assignmentsStore.activas.length)
const completedAssignments = computed(() =>
    assignmentsStore.historial.filter(a => a.estado === 'Finalizada').length
)

// ─── Computed — available for create ─────────────────────────
const availableVehicles = computed(() =>
    vehiclesStore.vehicles.filter(v =>
        v.estadoOperativo    === 'Disponible' &&
        v.estadoAdministrativo === 'Activo'
    )
)

const availableDrivers = computed(() =>
    driversStore.drivers.filter(d =>
        d.estadoLaboral === 'ACTIVO' &&
        !d.vehiculoAsignadoId &&
        d.licencias.some(l => l.estadoLegal !== 'Vencida')
    )
)

// ─── Computed — filtered + paginated ─────────────────────────
const filteredAssignments = computed(() => {
    let result = assignmentsStore.historial

    if (filterStatus.value !== 'Todas') {
        result = result.filter(a => a.estado === filterStatus.value)
    }

    if (search.value.trim()) {
        const query = search.value.toLowerCase()
        result = result.filter(a =>
            a.vehiculoPlaca.toLowerCase().includes(query) ||
            a.conductorNombre.toLowerCase().includes(query)
        )
    }

    return result
})

const totalPages = computed(() =>
    Math.max(1, Math.ceil(filteredAssignments.value.length / PAGE_SIZE))
)

const paginatedAssignments = computed(() => {
    const start = (currentPage.value - 1) * PAGE_SIZE
    return filteredAssignments.value.slice(start, start + PAGE_SIZE)
})

// ─── Actions — create ────────────────────────────────────────
function openCreateModal() {
    form.vehiculoId   = ''
    form.conductorId  = ''
    // usuarioResponsable refleja siempre el usuario activo
    form.usuarioResponsable = authStore.user?.name ?? 'Coordinador'
    formError.value   = ''
    showCreateModal.value = true
}

async function createAssignment() {
    formError.value = ''

    if (!form.vehiculoId || !form.conductorId) {
        formError.value = 'Selecciona un vehículo y un conductor.'
        return
    }

    const result = await assignmentsStore.createAssignment({ ...form })

    if (result.success) {
        showCreateModal.value = false
        return
    }

    formError.value = result.error ?? 'No se pudo crear la asignación.'
}

// ─── Actions — close ─────────────────────────────────────────
function openCloseModal(assignment: Assignment) {
    closingAssignment.value   = assignment
    closeForm.fechaFin        = new Date().toISOString().slice(0, 10)
    closeForm.kilometrajeFin  = assignment.kilometrajeInicio
    closeError.value          = ''
    showCloseModal.value      = true
}

async function closeAssignment() {
    if (!closingAssignment.value) return
    closeError.value = ''

    const result = await assignmentsStore.closeAssignment(
        closingAssignment.value.id,
        { ...closeForm }
    )

    if (result.success) {
        showCloseModal.value    = false
        closingAssignment.value = null
        return
    }

    closeError.value = result.error ?? 'No se pudo cerrar la asignación.'
}

// ─── Helpers ─────────────────────────────────────────────────
function formatDate(date: string): string {
    return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(new Date(date))
}

function getVehicleLabel(vehicle: Vehicle): string {
    return `${vehicle.placa} · ${vehicle.marca} ${vehicle.modelo}`
}

function getDriverLabel(driver: Driver): string {
    return `${driver.nombre} · ${driver.cedula}`
}
</script>

<template>
    <div class="p-6 space-y-6">

        <!-- ─── Header ─────────────────────────────────────── -->
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
                <h1 class="text-2xl font-bold text-slate-800">
                    Asignaciones
                </h1>
                <p class="text-sm text-slate-500 mt-1">
                    Gestión de asignaciones entre vehículos y conductores
                </p>
            </div>

            <button
                @click="openCreateModal"
                class="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-3 text-sm font-semibold transition"
            >
                Nueva asignación
            </button>
        </div>

        <!-- ─── Stats cards ────────────────────────────────── -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">

            <div class="bg-white border border-slate-200 rounded-xl p-5">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Total asignaciones
                </p>
                <h3 class="text-3xl font-bold text-slate-800 mt-2">
                    {{ totalAssignments }}
                </h3>
            </div>

            <div class="bg-white border border-slate-200 rounded-xl p-5">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Activas
                </p>
                <h3 class="text-3xl font-bold text-blue-600 mt-2">
                    {{ activeAssignments }}
                </h3>
            </div>

            <div class="bg-white border border-slate-200 rounded-xl p-5">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Finalizadas
                </p>
                <h3 class="text-3xl font-bold text-emerald-600 mt-2">
                    {{ completedAssignments }}
                </h3>
            </div>
        </div>

        <!-- ─── Filters ────────────────────────────────────── -->
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

            <!-- Status tabs -->
            <div class="bg-slate-100 p-1 rounded-xl flex flex-wrap gap-1">
                <button
                    v-for="tab in [
                        { value: 'Todas',      label: 'Todas',       count: totalAssignments },
                        { value: 'Activa',     label: 'Activas',     count: activeAssignments },
                        { value: 'Finalizada', label: 'Finalizadas', count: completedAssignments },
                    ]"
                    :key="tab.value"
                    @click="filterStatus = tab.value as typeof filterStatus"
                    :class="[
                        'px-4 py-2 rounded-lg text-sm font-medium transition',
                        filterStatus === tab.value
                            ? 'bg-white shadow-sm text-slate-800'
                            : 'text-slate-500 hover:text-slate-700'
                    ]"
                >
                    {{ tab.label }}
                    <span class="ml-1 text-xs">{{ tab.count }}</span>
                </button>
            </div>

            <!-- Search -->
            <div class="w-full lg:max-w-sm">
                <SearchBar
                    v-model="search"
                    placeholder="Buscar por placa o conductor..."
                />
            </div>
        </div>

        <!-- ─── Table ──────────────────────────────────────── -->
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">

            <DataTable
                :columns="columns"
                :rows="paginatedAssignments"
                row-key="id"
                empty-message="No hay asignaciones registradas."
            >

                <!-- Vehículo -->
                <template #cell-vehiculo="{ row }">
                    <div class="space-y-1">
                        <p class="font-mono font-bold text-xs tracking-widest text-slate-800">
                            {{ (row as Assignment).vehiculoPlaca }}
                        </p>
                        <p class="text-xs text-slate-400">
                            {{ (row as Assignment).vehiculoMarca }}
                            {{ (row as Assignment).vehiculoModelo }}
                        </p>
                    </div>
                </template>

                <!-- Conductor -->
                <template #cell-conductor="{ row }">
                    <div class="space-y-1">
                        <p class="font-semibold text-slate-800">
                            {{ (row as Assignment).conductorNombre }}
                        </p>
                        <p class="font-mono text-xs text-slate-400">
                            {{ (row as Assignment).conductorCedula }}
                        </p>
                    </div>
                </template>

                <!-- Fecha inicio -->
                <template #cell-fechaInicio="{ row }">
                    <span class="font-mono text-xs text-slate-700">
                        {{ formatDate((row as Assignment).fechaInicio) }}
                    </span>
                </template>

                <!-- Estado -->
                <template #cell-estado="{ row }">
                    <StatusBadge :status="(row as Assignment).estado" />
                </template>

                <!-- Acciones -->
                <template #cell-acciones="{ row }">
                    <div class="flex justify-end">
                        <button
                            v-if="(row as Assignment).estado === 'Activa'"
                            @click="openCloseModal(row as Assignment)"
                            class="px-3 py-1 text-xs rounded-lg border border-slate-200
                                text-slate-600 hover:bg-slate-50 transition"
                        >
                            Cerrar
                        </button>
                    </div>
                </template>

                <!-- Pagination -->
                <template #pagination>
                    <div
                        v-if="totalPages > 1"
                        class="flex items-center justify-between px-4 py-3 border-t border-slate-200"
                    >
                        <p class="text-xs text-slate-400">
                            Página {{ currentPage }} de {{ totalPages }}
                            ({{ filteredAssignments.length }} registros)
                        </p>

                        <div class="flex gap-2">
                            <button
                                @click="currentPage--"
                                :disabled="currentPage === 1"
                                class="px-3 py-1 text-xs rounded-lg border border-slate-200
                                    text-slate-600 hover:bg-slate-50 disabled:opacity-40
                                    disabled:cursor-not-allowed transition"
                            >
                                Anterior
                            </button>

                            <button
                                @click="currentPage++"
                                :disabled="currentPage === totalPages"
                                class="px-3 py-1 text-xs rounded-lg border border-slate-200
                                    text-slate-600 hover:bg-slate-50 disabled:opacity-40
                                    disabled:cursor-not-allowed transition"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                </template>

            </DataTable>
        </div>

        <!-- ─── Modal: Nueva asignación ───────────────────── -->
        <BaseModal
            :show="showCreateModal"
            title="Nueva asignación"
            size="md"
            @close="showCreateModal = false"
        >
            <div class="space-y-5">

                <div
                    v-if="formError"
                    class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700"
                >
                    {{ formError }}
                </div>

                <!-- Vehículo -->
                <div class="space-y-2">
                    <label class="text-xs font-semibold text-slate-600">
                        Vehículo
                    </label>
                    <select
                        v-model="form.vehiculoId"
                        class="w-full border border-slate-200 rounded-lg px-3 py-2
                            focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none"
                    >
                        <option value="">Selecciona un vehículo</option>
                        <option
                            v-for="vehicle in availableVehicles"
                            :key="vehicle.id"
                            :value="vehicle.id"
                        >
                            {{ getVehicleLabel(vehicle) }}
                        </option>
                    </select>

                    <p
                        v-if="availableVehicles.length === 0"
                        class="text-xs text-amber-700"
                    >
                        No hay vehículos disponibles en este momento.
                    </p>
                </div>

                <!-- Conductor -->
                <div class="space-y-2">
                    <label class="text-xs font-semibold text-slate-600">
                        Conductor
                    </label>
                    <select
                        v-model="form.conductorId"
                        class="w-full border border-slate-200 rounded-lg px-3 py-2
                            focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none"
                    >
                        <option value="">Selecciona un conductor</option>
                        <option
                            v-for="driver in availableDrivers"
                            :key="driver.id"
                            :value="driver.id"
                        >
                            {{ getDriverLabel(driver) }}
                        </option>
                    </select>

                    <p
                        v-if="availableDrivers.length === 0"
                        class="text-xs text-amber-700"
                    >
                        No hay conductores disponibles en este momento.
                    </p>
                </div>
            </div>

            <template #footer>
                <div class="flex justify-end gap-3">
                    <button
                        @click="showCreateModal = false"
                        class="px-4 py-2 rounded-xl border border-slate-200
                            text-slate-600 hover:bg-slate-50 transition"
                    >
                        Cancelar
                    </button>
                    <button
                        @click="createAssignment"
                        class="bg-blue-600 hover:bg-blue-700 text-white rounded-xl
                            px-5 py-2 text-sm font-semibold transition"
                    >
                        Crear asignación
                    </button>
                </div>
            </template>
        </BaseModal>

        <!-- ─── Modal: Cerrar asignación ──────────────────── -->
        <BaseModal
            :show="showCloseModal"
            title="Cerrar asignación"
            size="md"
            @close="showCloseModal = false"
        >
            <div class="space-y-5">

                <div
                    v-if="closeError"
                    class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700"
                >
                    {{ closeError }}
                </div>

                <!-- Resumen de la asignación -->
                <div
                    v-if="closingAssignment"
                    class="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1"
                >
                    <p class="text-xs font-semibold text-slate-600">
                        Asignación activa
                    </p>
                    <p class="text-sm font-semibold text-slate-800">
                        {{ closingAssignment.vehiculoPlaca }} —
                        {{ closingAssignment.conductorNombre }}
                    </p>
                    <p class="text-xs text-slate-400">
                        Km inicio:
                        {{ new Intl.NumberFormat('es-CO').format(closingAssignment.kilometrajeInicio) }} km
                    </p>
                </div>

                <!-- Fecha fin -->
                <div class="space-y-2">
                    <label class="text-xs font-semibold text-slate-600">
                        Fecha de cierre
                    </label>
                    <input
                        v-model="closeForm.fechaFin"
                        type="date"
                        class="w-full border border-slate-200 rounded-lg px-3 py-2
                            focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none"
                    />
                </div>

                <!-- Kilometraje fin -->
                <div class="space-y-2">
                    <label class="text-xs font-semibold text-slate-600">
                        Kilometraje final
                    </label>
                    <input
                        v-model.number="closeForm.kilometrajeFin"
                        type="number"
                        min="0"
                        class="w-full border border-slate-200 rounded-lg px-3 py-2
                            focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none"
                    />
                    <p
                        v-if="closingAssignment && closeForm.kilometrajeFin < closingAssignment.kilometrajeInicio"
                        class="text-xs text-red-600"
                    >
                        El kilometraje final no puede ser menor al de inicio.
                    </p>
                </div>
            </div>

            <template #footer>
                <div class="flex justify-end gap-3">
                    <button
                        @click="showCloseModal = false"
                        class="px-4 py-2 rounded-xl border border-slate-200
                            text-slate-600 hover:bg-slate-50 transition"
                    >
                        Cancelar
                    </button>
                    <button
                        @click="closeAssignment"
                        class="bg-blue-600 hover:bg-blue-700 text-white rounded-xl
                            px-5 py-2 text-sm font-semibold transition"
                    >
                        Cerrar asignación
                    </button>
                </div>
            </template>
        </BaseModal>

    </div>
</template>