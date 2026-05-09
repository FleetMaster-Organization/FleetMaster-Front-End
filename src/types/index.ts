// ─── Navigation ───────────────────────────────────────────────
export interface NavChild {
    label: string
    to: string
}

export interface NavItem {
    label: string
    icon: string
    to?: string
    children?: NavChild[]
}

// ─── Dashboard Stats ──────────────────────────────────────────
export interface StatCardData {
    label: string
    value: number
    icon: string
    trend?: { value: string; positive: boolean }
    subtitle?: string
    accent?: 'blue' | 'green' | 'amber' | 'red'
}

export interface VehicleStatData {
    label: string
    value: number
    icon: string
    accentColor: string
}

// ─── Alerts ───────────────────────────────────────────────────
export type DashboardAlertSeverity = 'critical' | 'warning' | 'info'

export interface Alert {
    id: string
    title: string
    description: string
    daysLeft: number
    severity: DashboardAlertSeverity
}

// ─── Activity ─────────────────────────────────────────────────
export interface ActivityItem {
    id: string
    title: string
    description: string
    actor: string
    timeAgo: string
    icon: string
}

// ─── Vehicle ──────────────────────────────────────────────────
export type VehicleStatus = 'Disponible' | 'Asignado' | 'Mantenimiento' | 'Vendido'
export type VehicleType = 'Camión' | 'Van' | 'Moto' | 'Automóvil' | 'Bus'

export interface Vehicle {
    id: string
    vin: string
    placa: string
    marca: string
    modelo: string
    anio: number
    tipo: VehicleType
    estado: VehicleStatus
    kilometraje: number
    conductorAsignadoId: string | null
    conductorAsignadoNombre: string | null
    fechaVencimientoSoat: string      
    fechaVencimientoTecnomecanica: string
    creadoEn: string
    actualizadoEn: string
}

// ─── Driver ─────────────────────────────────────────────
export type DriverStatus = 'Activo' | 'Inactivo' | 'Asignado'
export type LicenseType = 'A1' | 'A2' | 'B1' | 'B2' | 'B3' | 'C1' | 'C2' | 'C3'
export type LicenseStatusLegal = 'Vigente' | 'Vencida' | 'Por vencer'

export interface Driver {
    id: string
    nombre: string
    cedula: string
    telefono: string
    email: string
    tipoLicencia: LicenseType
    fechaVencimientoLicencia: string  
    estadoLegal: LicenseStatusLegal   
    estado: DriverStatus
    vehiculoAsignadoId: string | null
    vehiculoAsignadoPlaca: string | null
    contactoEmergenciaNombre: string
    contactoEmergenciaTelefono: string
    creadoEn: string
    actualizadoEn: string
}

// Para formularios (sin campos auto-calculados ni inmutables en edición)
export interface VehicleFormData {
    vin: string
    placa: string
    marca: string
    modelo: string
    anio: number
    tipo: VehicleType
    estado: VehicleStatus
    kilometraje: number
    fechaVencimientoSoat: string
    fechaVencimientoTecnomecanica: string
}

export interface DriverFormData {
    nombre: string
    cedula: string
    telefono: string
    email: string
    tipoLicencia: LicenseType
    fechaVencimientoLicencia: string
    estado: DriverStatus
    contactoEmergenciaNombre: string
    contactoEmergenciaTelefono: string
}

// ── Asignaciones ─────────────────────────────────────────────
export type AssignmentStatus = 'Activa' | 'Finalizada'

export interface Assignment {
    id: string
    vehiculoId: string
    vehiculoPlaca: string
    vehiculoMarca: string
    vehiculoModelo: string
    conductorId: string
    conductorNombre: string
    conductorCedula: string
    fechaInicio: string        // ISO datetime
    fechaFin: string | null
    kilometrajeInicio: number
    kilometrajeFin: number | null
    usuarioResponsable: string
    estado: AssignmentStatus
}

export interface AssignmentFormData {
    vehiculoId: string
    conductorId: string
    usuarioResponsable: string
}

export interface AssignmentCloseData {
    fechaFin: string
    kilometrajeFin: number
}

// ── Mantenimiento ─────────────────────────────────────────────
export type MaintenanceStatus = 'Abierto' | 'Cerrado'
export type MaintenanceType   = 'Preventivo' | 'Correctivo' | 'Revisión'

export interface MaintenanceRecord {
    id: string
    vehiculoId: string
    vehiculoPlaca: string
    vehiculoMarca: string
    vehiculoModelo: string
    tipo: MaintenanceType
    descripcion: string
    fechaIngreso: string       // ISO date, no futura
    fechaSalida: string | null
    kilometrajeIngreso: number
    kilometrajeSalida: number | null
    costo: number
    comentariosCierre: string | null
    proximoMantenimiento: string | null  // solo informativo
    estado: MaintenanceStatus
    tecnico: string
}

export interface MaintenanceFormData {
    vehiculoId: string
    tipo: MaintenanceType
    descripcion: string
    fechaIngreso: string
    costo: number
    tecnico: string
}

export interface MaintenanceCloseData {
    fechaSalida: string
    kilometrajeSalida: number
    comentariosCierre?: string
    proximoMantenimiento?: string
}

// ── Alertas ───────────────────────────────────────────────────
export type AlertSeverity = 'Vencido' | 'Por vencer'
export type AlertStatus   = 'Pendiente' | 'Gestionada'
export type AlertDocType  =
    | 'SOAT'
    | 'Tecnomecánica'
    | 'Licencia de conducción'

export interface SystemAlert {
    id: string
    tipo: AlertDocType
    severidad: AlertSeverity
    estado: AlertStatus
    entidadTipo: 'vehiculo' | 'conductor'
    entidadId: string
    entidadNombre: string   // placa o nombre del conductor
    fechaVencimiento: string 
    diasRestantes: number    // negativo = ya vencido
    gestionadaEn: string | null
    gestionadaPor: string | null
}

// ── Auditoría ─────────────────────────────────────────────────
export type AuditAction =
    | 'CREAR_VEHICULO'    | 'EDITAR_VEHICULO'    | 'INACTIVAR_VEHICULO'
    | 'CREAR_CONDUCTOR'   | 'EDITAR_CONDUCTOR'   | 'INACTIVAR_CONDUCTOR' | 'ACTIVAR_CONDUCTOR'
    | 'CREAR_ASIGNACION'  | 'CERRAR_ASIGNACION'
    | 'ABRIR_MANTENIMIENTO' | 'CERRAR_MANTENIMIENTO'
    | 'GESTIONAR_ALERTA'
    | 'CREAR_USUARIO'     | 'EDITAR_USUARIO'     | 'CAMBIAR_ROL'
    | 'ACTIVAR_USUARIO'   | 'DESACTIVAR_USUARIO'

export interface AuditLog {
    id: string
    fecha: string          
    usuario: string
    accion: AuditAction
    entidad: string        
    detalle: string        
}

// ── Usuarios ──────────────────────────────────────────────────
export type UserRole   = 'Administrador' | 'Coordinador de flota' | 'Mecánico' | 'Despachador'
export type UserStatus = 'Activo' | 'Inactivo'

export interface AppUser {
    id: string
    nombreCompleto: string
    email: string
    passwordHash: string   
    rol: UserRole
    estado: UserStatus
    creadoEn: string
    actualizadoEn: string
}

export interface UserFormData {
    nombreCompleto: string
    email: string
    password: string      
    rol: UserRole
    estado: UserStatus
}