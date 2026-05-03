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
export type AlertSeverity = 'critical' | 'warning' | 'info'

export interface Alert {
    id: string
    title: string
    description: string
    daysLeft: number
    severity: AlertSeverity
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