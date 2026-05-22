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

export type VehicleOperationalStatus =
    | 'Disponible'
    | 'En ruta'
    | 'En mantenimiento'

export type VehicleAdministrativeStatus =
    | 'Activo'
    | 'Inactivo'
    | 'Vendido'

export type VehicleType = 'Camión' | 'Van' | 'Moto' | 'Automóvil' | 'Bus'

export type VehicleDocumentType = 'SOAT' | 'TECNOMECANICA' | 'TARJETA_PROPIEDAD'

export type DocumentLegalStatus = 'Vigente' | 'Por vencer' | 'Vencido'

export interface VehicleDocument {
    id: string
    vehiculoId: string
    tipo: VehicleDocumentType           
    documentNumber?: string
    fechaExpedicion: string             
    fechaVencimiento: string            
    estadoLegal: DocumentLegalStatus    
}

export interface Vehicle {
    id: string
    vin: string
    placa: string
    marca: string
    modelo: string
    anio: number
    tipo: VehicleType
    estadoOperativo: VehicleOperationalStatus
    estadoAdministrativo: VehicleAdministrativeStatus
    kilometraje: number
    tarjetaPropiedad?: string
    conductorAsignadoId: string | null
    conductorAsignadoNombre: string | null
    documentos: VehicleDocument[]
    creadoEn: string
    actualizadoEn: string
}

/**
 * Helper: obtiene el documento de un tipo específico de un vehículo.
 */
export function getVehicleDocument(
    vehicle: Vehicle,
    tipo: VehicleDocumentType
): VehicleDocument | undefined {
    return vehicle.documentos.find(d => d.tipo === tipo)
}

/** Formulario de creación de vehículo (REQ-05 a REQ-08) */
export interface VehicleFormData {
    vin: string
    placa: string
    marca: string
    modelo: string
    anio: number
    tipo: VehicleType
    kilometraje: number                  
    tarjetaPropiedad?: string
    // Documentos: obligatorios al crear (REQ-05)
    soat: {
        fechaExpedicion: string
        fechaVencimiento: string
    }
    tecnomecanica: {
        fechaExpedicion: string
        fechaVencimiento: string
    }
}

/** Formulario de edición (placa y VIN no editables — REQ-10) */
export interface VehicleEditFormData {
    marca: string
    modelo: string
    anio: number
    tipo: VehicleType
    kilometraje: number
    tarjetaPropiedad?: string
    estadoAdministrativo: VehicleAdministrativeStatus
    // Actualización de documentos legales (REQ-09)
    soat: {
        fechaExpedicion: string
        fechaVencimiento: string
    }
    tecnomecanica: {
        fechaExpedicion: string
        fechaVencimiento: string
    }
}

// ─── Driver ───────────────────────────────────────────────────

export type DriverEmploymentStatus = 'ACTIVO' | 'INACTIVO' | 'RETIRADO'

/**
 * employment_substatus ENUM (drivers_db)
 * Subestado laboral; la FK del driver apunta aquí.
 * - Bajo ACTIVO: ACTIVO
 * - Bajo INACTIVO: SUSPENDIDO | VACACIONES | INCAPACIDAD
 * - Bajo RETIRADO: DESPEDIDO | RENUNCIA
 */
export type DriverEmploymentSubstatus =
    | 'ACTIVO'
    | 'SUSPENDIDO'
    | 'VACACIONES'
    | 'INCAPACIDAD'
    | 'DESPEDIDO'
    | 'RENUNCIA'

export type LicenseCategory = 'A1' | 'A2' | 'B1' | 'B2' | 'B3' | 'C1' | 'C2' | 'C3'

export type LicenseStatusLegal = 'Vigente' | 'Por vencer' | 'Vencida'

/**
 * Representa un registro de la tabla licenses (drivers_db).
 * Un conductor puede tener múltiples categorías; cada una es un registro.
 * UNIQUE constraint: (id_driver, category).
 */
export interface DriverLicense {
    id: string
    conductorId: string
    categoria: LicenseCategory
    fechaExpedicion: string         
    fechaVencimiento: string        
    estadoLegal: LicenseStatusLegal 
}

/**
 * Representa un registro de emergency_contacts (drivers_db).
 * Relación uno a muchos con drivers (REQ-16 exige al menos uno).
 */
export interface EmergencyContact {
    id: string
    conductorId: string
    nombre: string
    telefono: string
    relacion?: string               // opcional: parentesco o rol
}

/**
 * Entidad principal de la tabla drivers (drivers_db).
 * - subestado: FK a employment_substatus (estado padre por JOIN)
 * - licencias: JOIN con licenses (múltiples categorías)
 * - contactosEmergencia: JOIN con emergency_contacts
 */
export interface Driver {
    id: string
    nombre: string
    cedula: string                  
    telefono: string
    email: string
    // Estado laboral (viene de JOIN employment_substatus → employment_status)
    estadoLaboral: DriverEmploymentStatus
    subestadoLaboral: DriverEmploymentSubstatus
    // Asignación activa
    vehiculoAsignadoId: string | null
    vehiculoAsignadoPlaca: string | null
    // Licencias (múltiples categorías — JOIN con licenses)
    licencias: DriverLicense[]
    // Contactos de emergencia (JOIN con emergency_contacts)
    contactosEmergencia: EmergencyContact[]
    creadoEn: string
    actualizadoEn: string
}

/**
 * Helper: obtiene la licencia más crítica del conductor
 * (la que vence primero o la vencida más reciente).
 */
export function getPrimaryLicense(driver: Driver): DriverLicense | undefined {
    if (!driver.licencias.length) return undefined
    // Prioridad: Vencida > Por vencer > Vigente; dentro de cada grupo, la que vence antes
    const priority: Record<LicenseStatusLegal, number> = {
        Vencida: 0,
        'Por vencer': 1,
        Vigente: 2,
    }
    return [...driver.licencias].sort((a, b) => {
        const pDiff = priority[a.estadoLegal] - priority[b.estadoLegal]
        if (pDiff !== 0) return pDiff
        return new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()
    })[0]
}

/** Formulario de creación de conductor (REQ-16) */
export interface DriverFormData {
    nombre: string
    cedula: string
    telefono: string
    email: string
    estadoLaboral: DriverEmploymentStatus
    subestadoLaboral: DriverEmploymentSubstatus
    // Al menos una licencia obligatoria
    licencias: Array<{
        categoria: LicenseCategory
        fechaExpedicion: string
        fechaVencimiento: string
    }>
    // Al menos un contacto de emergencia obligatorio (REQ-16)
    contactosEmergencia: Array<{
        nombre: string
        telefono: string
        relacion?: string
    }>
}

/** Formulario de edición (cédula no editable — REQ-19) */
export interface DriverEditFormData {
    nombre: string
    telefono: string
    email: string
    estadoLaboral: DriverEmploymentStatus
    subestadoLaboral: DriverEmploymentSubstatus
    // Actualización de licencias: renovación actualiza registro existente por (id_driver, category)
    licencias: Array<{
        id?: string                 
        categoria: LicenseCategory
        fechaExpedicion: string
        fechaVencimiento: string
    }>
    contactosEmergencia: Array<{
        id?: string
        nombre: string
        telefono: string
        relacion?: string
    }>
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
    fechaInicio: string
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
    fechaIngreso: string
    fechaSalida: string | null
    kilometrajeIngreso: number
    kilometrajeSalida: number | null
    costo: number
    comentariosCierre: string | null
    proximoMantenimiento: string | null
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
    entidadNombre: string
    fechaVencimiento: string
    diasRestantes: number
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
export type UserRole   = 'admin' | 'coordinator' | 'mechanic' | 'dispatcher'
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