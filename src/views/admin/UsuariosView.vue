<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useUsersStore } from '@/stores/users'
import DataTable   from '@/components/ui/DataTable.vue'
import BaseModal   from '@/components/ui/BaseModal.vue'
import SearchBar   from '@/components/ui/SearchBar.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import type { AppUser, UserFormData, UserRole, UserStatus } from '@/types'

const usersStore = useUsersStore()

onMounted(async () => {
    await usersStore.loadUsers()
})

// ── Filtros ──────────────────────────────────────────────────
const search      = ref('')
const filterRol   = ref<UserRole | 'Todos'>('Todos')
const filterEstado = ref<UserStatus | 'Todos'>('Todos')

const roles: Array<UserRole | 'Todos'> = [
    'Todos', 'ROLE_ADMINISTRADOR', 'ROLE_COORDINADOR', 'ROLE_MECANICO', 'ROLE_DESPACHADOR'
]

const filteredUsers = computed(() => {
    let result = usersStore.users
    if (filterRol.value !== 'Todos')
        result = result.filter(u => u.rol === filterRol.value)
    if (filterEstado.value !== 'Todos')
        result = result.filter(u => u.estado === filterEstado.value)
    if (search.value.trim()) {
        const q = search.value.toLowerCase()
        result = result.filter(
        u => u.nombreCompleto.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
        )
    }
    return result
})

const columns = [
    { key: 'nombreCompleto', label: 'Nombre' },
    { key: 'email',          label: 'Email' },
    { key: 'rol',            label: 'Rol', width: '180px' },
    { key: 'estado',         label: 'Estado', width: '100px' },
    { key: 'creadoEn',       label: 'Creado', width: '110px' },
    { key: 'actions',        label: 'Acciones', width: '120px', align: 'center' as const },
]

// ── Modal Detalle ────────────────────────────────────────────
const showDetailModal = ref(false)
const detailUser      = ref<AppUser | null>(null)

function openDetail(u: AppUser) {
    detailUser.value  = u
    showDetailModal.value = true
}

function fmtDate(iso: string): string {
    return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(new Date(iso))
}

function fmtDateTime(iso: string): string {
    return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso))
}

// ── Modal Crear / Editar ─────────────────────────────────────
const showFormModal  = ref(false)
const editingUser    = ref<AppUser | null>(null)
const formError      = ref('')
const showPassword   = ref(false)

const EMPTY_FORM = (): UserFormData => ({
    nombreCompleto: '', email: '', password: '',
    rol: 'ROLE_COORDINADOR', estado: 'Activo',
})

const form = reactive<UserFormData>(EMPTY_FORM())

function openCreate() {
    editingUser.value = null
    Object.assign(form, EMPTY_FORM())
    formError.value  = ''
    showPassword.value = false
    showFormModal.value = true
}

function openEdit(u: AppUser) {
    editingUser.value = u
    Object.assign(form, {
        nombreCompleto: u.nombreCompleto,
        email: u.email,
        password: '',
        rol: u.rol,
        estado: u.estado,
    })
    formError.value  = ''
    showPassword.value = false
    showFormModal.value = true
}

async function submitForm() {
    formError.value = ''
    if (!form.nombreCompleto || !form.email) {
        formError.value = 'Nombre y email son obligatorios.'
        return
    }
    if (!editingUser.value && !form.password) {
        formError.value = 'La contraseña es obligatoria al crear un usuario.'
        return
    }

    let result: { success: boolean; error?: string }
    if (editingUser.value) {
        result = await usersStore.updateUser(editingUser.value.id, { ...form })
    } else {
        result = await usersStore.createUser({ ...form })
    }

    if (result.success) {
        showFormModal.value = false
    } else {
        formError.value = result.error ?? 'Error desconocido.'
    }
}

// ── Modal Confirmar cambio de estado ─────────────────────────
const showConfirmModal  = ref(false)
const confirmTarget     = ref<AppUser | null>(null)
const confirmAccion     = ref<'activar' | 'desactivar'>('desactivar')
const confirmError      = ref('')

function openConfirm(u: AppUser, accion: 'activar' | 'desactivar') {
    confirmTarget.value = u
    confirmAccion.value = accion
    confirmError.value  = ''
    showConfirmModal.value = true
}

async function doConfirm() {
    if (!confirmTarget.value) return
    const result = await usersStore.toggleStatus(confirmTarget.value.id, confirmAccion.value)
    if (result.success) {
        showConfirmModal.value = false
    } else {
        confirmError.value = result.error ?? 'Error.'
    }
}

// ── Colores por rol ──────────────────────────────────────────
const rolColors: Record<UserRole, string> = {
    'ROLE_ADMINISTRADOR':       'bg-purple-100 text-purple-700 border-purple-200',
    'ROLE_COORDINADOR': 'bg-blue-100 text-blue-700 border-blue-200',
    'ROLE_MECANICO':    'bg-amber-100 text-amber-700 border-amber-200',
    'ROLE_DESPACHADOR':  'bg-teal-100 text-teal-700 border-teal-200',
}

const allRoles: UserRole[] = [
    'ROLE_ADMINISTRADOR', 'ROLE_COORDINADOR', 'ROLE_MECANICO', 'ROLE_DESPACHADOR',
]
</script>

<template>
    <div class="p-6 space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
        <div>
            <h1 class="text-2xl font-bold text-slate-800">Usuarios</h1>
            <p class="text-sm text-slate-500 mt-0.5">
            {{ usersStore.activos.length }} activos ·
            {{ usersStore.inactivos.length }} inactivos ·
            {{ usersStore.users.length }} en total
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
            Nuevo usuario
        </button>
        </div>

        <!-- Filtros -->
        <div class="flex gap-3 flex-wrap items-end">
        <div class="flex-1 min-w- max-w-xs">
            <SearchBar v-model="search" placeholder="Buscar por nombre o email..." />
        </div>

        <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Rol</label>
            <select v-model="filterRol"
            class="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
            >
            <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
            </select>
        </div>

        <div class="flex gap-2">
            <button
            v-for="s in ['Todos', 'Activo', 'Inactivo']"
            :key="s"
            :class="[
                'px-3 py-2 text-sm font-medium rounded-lg border transition-all',
                filterEstado === s
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300',
            ]"
            @click="filterEstado = s as UserStatus | 'Todos'"
            >
            {{ s }}
            </button>
        </div>
        </div>

        <!-- Tabla -->
        <DataTable
        :columns="columns"
        :rows="filteredUsers"
        row-key="id"
        empty-message="No se encontraron usuarios con los filtros aplicados."
        >
        <template #cell-nombreCompleto="{ row }">
            <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center
                        text-xs font-bold text-slate-600 shrink-0">
                {{ (row as AppUser).nombreCompleto.charAt(0).toUpperCase() }}
            </div>
            <button
                class="font-medium text-slate-800 hover:text-blue-600 transition-colors text-left"
                @click="openDetail(row as AppUser)"
            >
                {{ (row as AppUser).nombreCompleto }}
            </button>
            </div>
        </template>

        <template #cell-email="{ row }">
            <span class="text-sm text-slate-500 font-mono">{{ (row as AppUser).email }}</span>
        </template>

        <template #cell-rol="{ row }">
            <span :class="[
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
            rolColors[(row as AppUser).rol],
            ]">
            {{ (row as AppUser).rol }}
            </span>
        </template>

        <template #cell-estado="{ row }">
            <StatusBadge :status="(row as AppUser).estado" />
        </template>

        <template #cell-creadoEn="{ row }">
            <span class="text-xs text-slate-400">{{ fmtDate((row as AppUser).creadoEn) }}</span>
        </template>

        <template #cell-actions="{ row }">
            <div class="flex items-center justify-center gap-1">
            <!-- Ver detalle -->
            <button
                class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Ver detalle"
                @click="openDetail(row as AppUser)"
            >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
            </button>

            <!-- Editar -->
            <button
                class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Editar"
                @click="openEdit(row as AppUser)"
            >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                />
                </svg>
            </button>

            <!-- Activar / Desactivar -->
            <button
                v-if="(row as AppUser).estado === 'Activo'"
                class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Desactivar"
                @click="openConfirm(row as AppUser, 'desactivar')"
            >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
                </svg>
            </button>
            <button
                v-else
                class="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                title="Activar"
                @click="openConfirm(row as AppUser, 'activar')"
            >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            </button>
            </div>
        </template>
        </DataTable>

        <!-- ── Modal Detalle ──────────────────────────────────── -->
        <BaseModal :show="showDetailModal" title="Detalle de usuario" size="sm" @close="showDetailModal = false">
        <div v-if="detailUser" class="space-y-4">
            <!-- Avatar + nombre -->
            <div class="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div class="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center
                        text-xl font-bold text-white shrink-0">
                {{ detailUser.nombreCompleto.charAt(0).toUpperCase() }}
            </div>
            <div>
                <p class="font-semibold text-slate-800 text-lg">{{ detailUser.nombreCompleto }}</p>
                <p class="text-sm text-slate-500">{{ detailUser.email }}</p>
            </div>
            </div>

            <div class="grid grid-cols-2 gap-3 text-sm">
            <div class="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p class="text-xs text-slate-400 mb-1">Rol</p>
                <span :class="['inline-flex px-2 py-0.5 rounded-full text-xs font-medium border', rolColors[detailUser.rol]]">
                {{ detailUser.rol }}
                </span>
            </div>
            <div class="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p class="text-xs text-slate-400 mb-1">Estado</p>
                <StatusBadge :status="detailUser.estado" />
            </div>
            <div class="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p class="text-xs text-slate-400 mb-1">Creado el</p>
                <p class="font-medium text-slate-700">{{ fmtDateTime(detailUser.creadoEn) }}</p>
            </div>
            <div class="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p class="text-xs text-slate-400 mb-1">Última actualización</p>
                <p class="font-medium text-slate-700">{{ fmtDateTime(detailUser.actualizadoEn) }}</p>
            </div>
            </div>

            <div class="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm">
            <p class="text-xs text-slate-400 mb-1">ID del sistema</p>
            <p class="font-mono text-slate-500 text-xs">{{ detailUser.id }}</p>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end gap-3">
            <button
                class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                @click="showDetailModal = false"
            >Cerrar</button>
            <button
                class="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                @click="showDetailModal = false; openEdit(detailUser!)"
            >Editar</button>
            </div>
        </template>
        </BaseModal>

        <!-- ── Modal Crear / Editar ──────────────────────────── -->
        <BaseModal
        :show="showFormModal"
        :title="editingUser ? 'Editar usuario' : 'Nuevo usuario'"
        size="md"
        @close="showFormModal = false"
        >
        <div class="space-y-4">
            <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                Nombre completo <span class="text-red-500">*</span>
            </label>
            <input v-model="form.nombreCompleto" type="text"
                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                placeholder="Laura Coordinadora"
            />
            </div>

            <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                Email <span class="text-red-500">*</span>
            </label>
            <input v-model="form.email" type="email"
                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                placeholder="usuario@logifast.com"
            />
            </div>

            <!-- Contraseña -->
            <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">
                Contraseña
                <span v-if="!editingUser" class="text-red-500">*</span>
                <span v-else class="text-slate-400 font-normal">(dejar vacío para no cambiar)</span>
            </label>
            <div class="relative">
                <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                class="w-full px-3 py-2 pr-10 text-sm border border-slate-200 rounded-lg bg-white
                        focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                :placeholder="editingUser ? 'Nueva contraseña (opcional)' : 'Mínimo 6 caracteres'"
                />
                <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                @click="showPassword = !showPassword"
                >
                <svg v-if="!showPassword" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/>
                </svg>
                </button>
            </div>
            </div>

            <!-- Rol -->
            <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Rol</label>
            <select v-model="form.rol"
                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
            >
                <option v-for="r in allRoles" :key="r" :value="r">{{ r }}</option>
            </select>
            <!-- Preview badge del rol seleccionado -->
            <div class="mt-2 flex items-center gap-2">
                <span class="text-xs text-slate-400">Vista previa:</span>
                <span :class="['inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border', rolColors[form.rol]]">
                {{ form.rol }}
                </span>
            </div>
            </div>

            <!-- Estado (solo en edición) -->
            <div v-if="editingUser">
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Estado</label>
            <div class="flex gap-3">
                <label v-for="s in ['Activo', 'Inactivo']" :key="s"
                class="flex items-center gap-2 cursor-pointer">
                <input type="radio" :value="s" v-model="form.estado" class="accent-blue-600" />
                <span class="text-sm text-slate-700">{{ s }}</span>
                </label>
            </div>
            </div>

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
            >{{ editingUser ? 'Guardar cambios' : 'Crear usuario' }}</button>
            </div>
        </template>
        </BaseModal>

        <!-- ── Modal Confirmar estado ─────────────────────────── -->
        <BaseModal
        :show="showConfirmModal"
        :title="confirmAccion === 'desactivar' ? 'Desactivar usuario' : 'Activar usuario'"
        size="sm"
        @close="showConfirmModal = false"
        >
        <div class="space-y-3">
            <div :class="[
            'p-3 rounded-lg border text-sm',
            confirmAccion === 'desactivar'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800',
            ]">
            <p v-if="confirmAccion === 'desactivar'">
                ¿Desactivar la cuenta de <strong>{{ confirmTarget?.nombreCompleto }}</strong>?
                No podrá iniciar sesión en el sistema.
            </p>
            <p v-else>
                ¿Activar la cuenta de <strong>{{ confirmTarget?.nombreCompleto }}</strong>?
                Recuperará acceso al sistema.
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
            >Cancelar</button>
            <button
                :class="[
                'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
                confirmAccion === 'desactivar'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700',
                ]"
                @click="doConfirm"
            >
                {{ confirmAccion === 'desactivar' ? 'Sí, desactivar' : 'Sí, activar' }}
            </button>
            </div>
        </template>
        </BaseModal>
    </div>
</template>