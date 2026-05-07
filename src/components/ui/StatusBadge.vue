<script setup lang="ts">
interface Props {
    status: string
    variant?: 'default' | 'license'
}

const props = withDefaults(defineProps<Props>(), {
    variant: 'default',
})

// Mapa extensible — agregar nuevos estados sin tocar el componente
const colorMap: Record<string, string> = {
  // Vehículos
    Disponible: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Asignado: 'bg-blue-100 text-blue-700 border-blue-200',
    Mantenimiento: 'bg-amber-100 text-amber-700 border-amber-200',
    Vendido: 'bg-slate-100 text-slate-500 border-slate-200',
  // Conductores
    Activo: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Inactivo: 'bg-slate-100 text-slate-500 border-slate-200',
  // Licencia
    Vigente: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Por vencer': 'bg-amber-100 text-amber-700 border-amber-200',
    Vencida: 'bg-red-100 text-red-700 border-red-200',
  // Genéricos (para módulos futuros)
    Activa: 'bg-blue-100 text-blue-700 border-blue-200',
    Completado: 'bg-blue-100 text-blue-700 border-blue-200',
    Pendiente: 'bg-amber-100 text-amber-700 border-amber-200',
    Cancelado: 'bg-red-100 text-red-700 border-red-200',
    Crítico: 'bg-red-100 text-red-700 border-red-200',
    Advertencia: 'bg-amber-100 text-amber-700 border-amber-200',
    Finalizada: 'bg-slate-100 text-slate-500 border-slate-200',
    Abierto: 'bg-amber-100 text-amber-700 border-amber-200',
    Cerrado: 'bg-emerald-100 text-emerald-700 border-emerald-200',  
}

const dotMap: Record<string, string> = {
    Disponible: 'bg-emerald-500', Activo: 'bg-emerald-500',
    Vigente: 'bg-emerald-500', Activa: 'bg-blue-500', Completado: 'bg-blue-500',
    Asignado: 'bg-blue-500',
    Mantenimiento: 'bg-amber-500', 'Por vencer': 'bg-amber-500',
    Pendiente: 'bg-amber-500', Advertencia: 'bg-amber-500',
    Vendido: 'bg-slate-400', Inactivo: 'bg-slate-400', Cancelado: 'bg-red-500',
    Vencida: 'bg-red-500', Crítico: 'bg-red-500',
    Finalizada: 'bg-slate-400',
    Abierto: 'bg-amber-500',
    Cerrado: 'bg-emerald-500',
}

const classes = colorMap[props.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'
const dotClass = dotMap[props.status] ?? 'bg-gray-400'
</script>

<template>
    <span
        :class="['inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border', classes]"
    >
        <span :class="['w-1.5 h-1.5 rounded-full shrink-0', dotClass]" />
        {{ status }}
    </span>
</template>