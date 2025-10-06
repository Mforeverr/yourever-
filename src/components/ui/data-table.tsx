import * as React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table"
import { Button } from "./button"
import { Badge } from "./badge"
import { Checkbox } from "./checkbox"
import { 
  ChevronDown, 
  ChevronUp, 
  MoreHorizontal,
  ArrowUpDown,
  Eye,
  Edit,
  Trash
} from "lucide-react"
import { cn } from "@/lib/utils"

interface DataTableColumn<T> {
  key: keyof T
  title: string
  sortable?: boolean
  render?: (value: any, row: T) => React.ReactNode
  width?: string
}

interface DataTableAction<T> {
  label: string
  icon?: React.ReactNode
  onClick: (row: T) => void
  variant?: 'default' | 'destructive'
}

interface DataTableProps<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  actions?: DataTableAction<T>[]
  selectable?: boolean
  onSelectionChange?: (selectedRows: T[]) => void
  onSort?: (column: keyof T, direction: 'asc' | 'desc') => void
  emptyMessage?: string
  className?: string
}

function DataTable<T extends Record<string, any>>({
  data,
  columns,
  actions,
  selectable = false,
  onSelectionChange,
  onSort,
  emptyMessage = "No data available",
  className
}: DataTableProps<T>) {
  const [selectedRows, setSelectedRows] = React.useState<Set<string | number>>(new Set())
  const [sortColumn, setSortColumn] = React.useState<keyof T | null>(null)
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc')

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = data.map(row => row.id || row.key)
      setSelectedRows(new Set(allIds))
      onSelectionChange?.(data)
    } else {
      setSelectedRows(new Set())
      onSelectionChange?.([])
    }
  }

  const handleSelectRow = (id: string | number, checked: boolean, row: T) => {
    const newSelected = new Set(selectedRows)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedRows(newSelected)
    
    const selectedData = data.filter(row => 
      newSelected.has(row.id || row.key)
    )
    onSelectionChange?.(selectedData)
  }

  const handleSort = (column: keyof T) => {
    if (!onSort) return
    
    const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc'
    setSortColumn(column)
    setSortDirection(newDirection)
    onSort(column, newDirection)
  }

  const isAllSelected = data.length > 0 && selectedRows.size === data.length
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < data.length

  return (
    <div className={cn("w-full", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isIndeterminate
                  }}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead 
                key={String(column.key)} 
                className={cn(column.sortable && "cursor-pointer hover:bg-accent/50")}
                style={{ width: column.width }}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center gap-1">
                  {column.title}
                  {column.sortable && (
                    <div className="flex flex-col">
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  )}
                </div>
              </TableHead>
            ))}
            {actions && actions.length > 0 && (
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell 
                colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} 
                className="text-center text-muted-foreground py-8"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => {
              const rowId = row.id || row.key
              const isSelected = selectedRows.has(rowId)
              
              return (
                <TableRow 
                  key={rowId}
                  className={isSelected && "bg-accent/50"}
                >
                  {selectable && (
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectRow(rowId, checked as boolean, row)}
                        aria-label="Select row"
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={String(column.key)}>
                      {column.render ? 
                        column.render(row[column.key], row) : 
                        String(row[column.key] || '')
                      }
                    </TableCell>
                  ))}
                  {actions && actions.length > 0 && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {actions.map((action, index) => (
                          <Button
                            key={index}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => action.onClick(row)}
                          >
                            {action.icon}
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export { DataTable, type DataTableColumn, type DataTableAction }