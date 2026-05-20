export interface DataTableColumn {
    key: string
    label: string
    width?: string
    align?: 'left' | 'center' | 'right'
}

export interface DataTableCellSlotProps {
    row: Record<string, unknown>
    value: unknown
}

export interface DataTableProps {
    columns: DataTableColumn[]
    rows: Record<string, unknown>[]
    rowKey?: string
    loading?: boolean
    emptyMessage?: string
}

export type DataTableSlots = {
    pagination?: (props: Record<string, never>) => unknown
} & Record<`cell-${string}`, (props: DataTableCellSlotProps) => unknown>
