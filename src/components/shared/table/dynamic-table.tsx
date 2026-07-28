/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useMemo, type ReactNode } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  Group,
  X,
  Plus,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { DataTableFrame } from "@/components/shared/table/data-table-frame"
import {
  PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
} from "@/components/shared/table/table-constant"

/** Cell value types DynamicTable can detect / filter on. */
export type DataType =
  | "string"
  | "number"
  | "date"
  | "boolean"
  | "array"
  | "object"
  | "unknown"

/** Column definition for DynamicTable. */
export type ColumnConfig = {
  key: string
  label: string
  type?: DataType
  format?: (value: unknown) => ReactNode
  sortable?: boolean
}

/** Context passed to `rowActions` for each data row. */
export type RowActionContext = {
  row: Record<string, unknown>
}

export type DynamicTableProps = {
  data: Record<string, unknown>[]
  columns?: ColumnConfig[]
  pageSize?: number
  searchable?: boolean
  sortable?: boolean
  filterable?: boolean
  groupable?: boolean
  /** Extra controls rendered in the toolbar (e.g. Create). */
  toolbarActions?: ReactNode
  /** Per-row action cell content (Edit / Delete). Skipped on group header rows. */
  rowActions?: (ctx: RowActionContext) => ReactNode
}

type GroupRow = {
  __isGroupRow: true
  __groupKey: string
  __groupField: string
  __itemCount: number
  __items: Record<string, unknown>[]
}

type TableRowData = Record<string, unknown> | GroupRow

function isGroupRow(row: TableRowData): row is GroupRow {
  return (
    typeof row === "object" &&
    row !== null &&
    "__isGroupRow" in row &&
    row.__isGroupRow === true
  )
}

interface FilterRule {
  field: string
  operator: string
  value: string
}

interface FilterState {
  logicOperator: "AND" | "OR"
  rules: FilterRule[]
}

export function DynamicTable({
  data = [],
  columns,
  pageSize = PAGE_SIZE,
  searchable = true,
  sortable = true,
  filterable = true,
  groupable = true,
  toolbarActions,
  rowActions,
}: DynamicTableProps) {

  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null)
  const [filterState, setFilterState] = useState<FilterState>({
    logicOperator: "AND",
    rules: [],
  })
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    logicOperator: "AND",
    rules: [],
  })
  const [groupByField, setGroupByField] = useState<string | null>(null)
  const [appliedTags, setAppliedTags] = useState<string[]>([])
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  const [currentPageSize, setCurrentPageSize] = useState(pageSize)

  
  const autoDetectedColumns = useMemo((): ColumnConfig[] => {
    if (columns) {
      return columns.filter((column) => column.key !== "__actions")
    }

    if (data.length === 0) return []

    
    const keys = Array.from(
      new Set(
        data
          .flatMap((item) => Object.keys(item))
          .filter((key) => key !== "__actions"),
      ),
    )

    return keys.map((key): ColumnConfig => {
      
      const type = detectDataType(data.find((item) => item[key] !== undefined)?.[key])

      return {
        key,
        label: key.charAt(0).toUpperCase() + key.replace(/([A-Z])/g, " $1").slice(1),
        type,
        sortable: type !== "object" && type !== "unknown",
      }
    })
  }, [data, columns])

  const columnCount =
    autoDetectedColumns.length + (rowActions ? 1 : 0)

  
  function detectDataType(value: unknown): DataType {
    if (value === null || value === undefined) return "unknown"

    if (Array.isArray(value)) return "array"

    if (value instanceof Date) return "date"

    if (typeof value === "string") {
      
      const datePattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/
      if (datePattern.test(value) && !isNaN(Date.parse(value))) {
        return "date"
      }
      return "string"
    }

    if (typeof value === "number") return "number"
    if (typeof value === "boolean") return "boolean"
    if (typeof value === "object") return "object"

    return "unknown"
  }

  
  const applyFilter = () => {
    setActiveFilters(filterState)

    
    const tags = filterState.rules.map((rule) => `${rule.field} ${rule.operator} ${rule.value}`)
    setAppliedTags(tags)
  }

  
  const removeFilter = (index: number) => {
    const newRules = [...filterState.rules]
    newRules.splice(index, 1)
    const newFilterState = { ...filterState, rules: newRules }
    setFilterState(newFilterState)
    setActiveFilters(newFilterState)

    const newTags = [...appliedTags]
    newTags.splice(index, 1)
    setAppliedTags(newTags)
  }

  
  const addFilterRule = () => {
    if (autoDetectedColumns.length === 0) return

    setFilterState((prev) => ({
      ...prev,
      rules: [
        ...prev.rules,
        {
          field: autoDetectedColumns[0].key,
          operator: "=",
          value: "",
        },
      ],
    }))
  }

  
  const updateFilterRule = (index: number, field: string, value: any) => {
    const newRules = [...filterState.rules]
    newRules[index] = { ...newRules[index], [field]: value }
    setFilterState({ ...filterState, rules: newRules })
  }

  
  const getOperatorsForType = (type: DataType) => {
    switch (type) {
      case "number":
      case "date":
        return [
          { value: "=", label: "=" },
          { value: "!=", label: "!=" },
          { value: ">", label: ">" },
          { value: "<", label: "<" },
          { value: ">=", label: ">=" },
          { value: "<=", label: "<=" },
        ]
      case "string":
        return [
          { value: "=", label: "=" },
          { value: "!=", label: "!=" },
          { value: "contains", label: "Contains" },
          { value: "startsWith", label: "Starts with" },
          { value: "endsWith", label: "Ends with" },
        ]
      case "boolean":
        return [
          { value: "=", label: "=" },
          { value: "!=", label: "!=" },
        ]
      default:
        return [
          { value: "=", label: "=" },
          { value: "!=", label: "!=" },
        ]
    }
  }

  
  const evaluateFilterRule = (value: any, rule: FilterRule, type: DataType) => {
    if (value === null || value === undefined) return false

    const strValue = String(value).toLowerCase()
    const filterValue = rule.value.toLowerCase()

    switch (rule.operator) {
      case "=":
        if (type === "boolean") {
          return (value === true && filterValue === "true") || (value === false && filterValue === "false")
        }
        return type === "string" ? strValue === filterValue : value == rule.value
      case "!=":
        if (type === "boolean") {
          return (value === true && filterValue !== "true") || (value === false && filterValue !== "false")
        }
        return type === "string" ? strValue !== filterValue : value != rule.value
      case ">":
        return type === "date" ? new Date(value) > new Date(rule.value) : Number(value) > Number(rule.value)
      case "<":
        return type === "date" ? new Date(value) < new Date(rule.value) : Number(value) < Number(rule.value)
      case ">=":
        return type === "date" ? new Date(value) >= new Date(rule.value) : Number(value) >= Number(rule.value)
      case "<=":
        return type === "date" ? new Date(value) <= new Date(rule.value) : Number(value) <= Number(rule.value)
      case "contains":
        return strValue.includes(filterValue)
      case "startsWith":
        return strValue.startsWith(filterValue)
      case "endsWith":
        return strValue.endsWith(filterValue)
      default:
        return false
    }
  }

  
  function formatValue(value: unknown, type: DataType): string {
    if (value === null || value === undefined) return ""

    switch (type) {
      case "date": {
        const date = value instanceof Date ? value : new Date(String(value))
        return isNaN(date.getTime()) ? String(value) : date.toLocaleDateString()
      }
      case "array":
        return Array.isArray(value) ? value.join(", ") : String(value)
      case "object":
        return JSON.stringify(value)
      default:
        return String(value)
    }
  }

  
  const filteredData = useMemo(() => {
    let result = data

    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const firstColumnKey = autoDetectedColumns[0]?.key
      if (firstColumnKey) {
        result = result.filter((row) => {
          const value = row[firstColumnKey]
          if (value !== null && value !== undefined) {
            return String(value).toLowerCase().includes(query)
          }
          return false
        })
      }
    }

    
    if (activeFilters.rules.length > 0) {
      result = result.filter((row) => {
        const results = activeFilters.rules.map((rule) => {
          const column = autoDetectedColumns.find((col) => col.key === rule.field)
          if (!column) return false

          const value = row[rule.field]
          const type = column.type || detectDataType(value)

          return evaluateFilterRule(value, rule, type)
        })

        return activeFilters.logicOperator === "AND" ? results.every(Boolean) : results.some(Boolean)
      })
    }

    return result
  }, [data, searchQuery, activeFilters, autoDetectedColumns])

  
  const sortedAndGroupedData = useMemo((): TableRowData[] => {
    let result: TableRowData[] = [...filteredData]

    
    if (sortConfig) {
      result = [...filteredData].sort((a, b) => {
        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]

        
        if (aValue === undefined || aValue === null) return sortConfig.direction === "asc" ? -1 : 1
        if (bValue === undefined || bValue === null) return sortConfig.direction === "asc" ? 1 : -1

        
        const columnType = autoDetectedColumns.find((col) => col.key === sortConfig.key)?.type || "string"

        if (columnType === "date") {
          const dateA = aValue instanceof Date ? aValue : new Date(String(aValue))
          const dateB = bValue instanceof Date ? bValue : new Date(String(bValue))
          return sortConfig.direction === "asc" ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime()
        }

        if (columnType === "number") {
          return sortConfig.direction === "asc" ? Number(aValue) - Number(bValue) : Number(bValue) - Number(aValue)
        }

        
        const strA = String(aValue).toLowerCase()
        const strB = String(bValue).toLowerCase()

        if (sortConfig.direction === "asc") {
          return strA.localeCompare(strB)
        } else {
          return strB.localeCompare(strA)
        }
      })
    }

    
    if (groupByField) {
      const groups: Record<string, Record<string, unknown>[]> = {}
      result.forEach((item) => {
        if (isGroupRow(item)) return
        const groupValue = item[groupByField]
        const groupKey = groupValue === null || groupValue === undefined ? "No value" : String(groupValue)
        if (!groups[groupKey]) {
          groups[groupKey] = []
        }
        groups[groupKey].push(item)
      })
      result = Object.entries(groups).map(([groupKey, items]) => ({
        __isGroupRow: true as const,
        __groupKey: groupKey,
        __groupField: groupByField,
        __itemCount: items.length,
        __items: items,
      }))
    }

    return result
  }, [filteredData, sortConfig, groupByField, autoDetectedColumns])

  
  const totalPages = Math.ceil(sortedAndGroupedData.length / currentPageSize)
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * currentPageSize
    return sortedAndGroupedData.slice(startIndex, startIndex + currentPageSize)
  }, [sortedAndGroupedData, currentPage, currentPageSize])

  
  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  
  const handleSort = (key: string) => {
    if (!sortable) return

    const column = autoDetectedColumns.find((col) => col.key === key)
    if (!column?.sortable) return

    setSortConfig((current) => {
      if (current?.key === key) {
        return current.direction === "asc" ? { key, direction: "desc" } : null
      }
      return { key, direction: "asc" }
    })
  }

  
  const renderCellValue = (
    row: Record<string, unknown>,
    columnKey: string,
    type: DataType,
  ) => {
    const value = row[columnKey]
    if (value === null || value === undefined) return null

    switch (type) {
      case "boolean":
        return (
          <Badge variant={value ? "default" : "outline"}>
            {value ? "Yes" : "No"}
          </Badge>
        )
      case "array":
        if (!Array.isArray(value)) return formatValue(value, type)
        return (
          <div className="flex flex-wrap gap-1">
            {value.slice(0, 3).map((item, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {String(item)}
              </Badge>
            ))}
            {value.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{value.length - 3}
              </Badge>
            )}
          </div>
        )
      case "date": {
        const date = value instanceof Date ? value : new Date(String(value))
        return isNaN(date.getTime()) ? String(value) : date.toLocaleDateString()
      }
      default:
        return formatValue(value, type)
    }
  }

  
  useEffect(() => {
    const newTotalPages = Math.ceil(sortedAndGroupedData.length / currentPageSize)
    if (currentPage > newTotalPages) {
      
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentPage(Math.max(1, newTotalPages))
    }
  }, [sortedAndGroupedData, currentPageSize, currentPage])

  const paginationFooter =
    sortedAndGroupedData.length > 0 ? (
      <div className="table-footer-bar">
        <div className="flex items-center space-x-2">
          <span>Show</span>
          <Select
            value={currentPageSize.toString()}
            onValueChange={(value) => {
              const newPageSize = Number.parseInt(value)
              setCurrentPageSize(newPageSize)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-17.5">
              <SelectValue placeholder={currentPageSize} />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>per page</span>
        </div>
        <div>
          Showing {(currentPage - 1) * currentPageSize + 1} to{" "}
          {Math.min(
            currentPage * currentPageSize,
            sortedAndGroupedData.length,
          )}{" "}
          of {sortedAndGroupedData.length} results
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Select
            value={currentPage.toString()}
            onValueChange={(value) =>
              handlePageChange(Number.parseInt(value))
            }
          >
            <SelectTrigger className="w-16">
              <SelectValue placeholder={currentPage} />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: Math.max(totalPages, 1) }, (_, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span>of {Math.max(totalPages, 1)}</span>

          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage >= totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    ) : undefined

  return (
    <DataTableFrame
      toolbar={
        <>
        {searchable ? (
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <div className="table-toolbar-search">
              {appliedTags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  <Filter className="h-3 w-3" />
                  {tag}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeFilter(index)}
                  />
                </Badge>
              ))}
              {groupByField ? (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Group className="h-3 w-3" />
                  Grouped by: {groupByField}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setGroupByField(null)}
                  />
                </Badge>
              ) : null}
              {searchQuery ? (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Search className="h-3 w-3" />
                  {autoDetectedColumns[0]?.label}: {searchQuery}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSearchQuery("")}
                  />
                </Badge>
              ) : null}
              <Input
                type="search"
                placeholder="Search…"
                className="grow border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {filterable ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-150">
                <DialogHeader>
                  <DialogTitle>Advanced filters</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="flex gap-2">
                    <Button
                      variant={
                        filterState.logicOperator === "AND"
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        setFilterState({
                          ...filterState,
                          logicOperator: "AND",
                        })
                      }
                    >
                      AND
                    </Button>
                    <Button
                      variant={
                        filterState.logicOperator === "OR"
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        setFilterState({
                          ...filterState,
                          logicOperator: "OR",
                        })
                      }
                    >
                      OR
                    </Button>

                    <div className="ml-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addFilterRule}
                      >
                        <Plus className="mr-1 h-4 w-4" /> Rule
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {filterState.rules.map((rule, index) => {
                      const column = autoDetectedColumns.find(
                        (col) => col.key === rule.field,
                      )
                      const dataType = column?.type || "string"
                      const operators = getOperatorsForType(dataType)

                      return (
                        <div key={index} className="flex items-center gap-2">
                          <Select
                            value={rule.field}
                            onValueChange={(value) =>
                              updateFilterRule(index, "field", value)
                            }
                          >
                            <SelectTrigger className="w-45">
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              {autoDetectedColumns.map((column) => (
                                <SelectItem
                                  key={column.key}
                                  value={column.key}
                                >
                                  {column.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={rule.operator}
                            onValueChange={(value) =>
                              updateFilterRule(index, "operator", value)
                            }
                          >
                            <SelectTrigger className="w-37.5">
                              <SelectValue placeholder="Operator" />
                            </SelectTrigger>
                            <SelectContent>
                              {operators.map((op) => (
                                <SelectItem key={op.value} value={op.value}>
                                  {op.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Input
                            value={rule.value}
                            onChange={(e) =>
                              updateFilterRule(index, "value", e.target.value)
                            }
                            className="flex-1"
                            placeholder="Value"
                          />

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newRules = [...filterState.rules]
                              newRules.splice(index, 1)
                              setFilterState({
                                ...filterState,
                                rules: newRules,
                              })
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })}

                    {filterState.rules.length === 0 ? (
                      <div className="py-4 text-center text-muted-foreground">
                        No filter rules yet. Click &quot;Rule&quot; to add one.
                      </div>
                    ) : null}
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilterState({ logicOperator: "AND", rules: [] })
                      setActiveFilters({ logicOperator: "AND", rules: [] })
                      setAppliedTags([])
                    }}
                  >
                    Clear
                  </Button>
                  <Button onClick={applyFilter}>Apply</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}

          {groupable ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Group className="mr-2 h-4 w-4" />
                  Group by
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-50 p-0" align="start">
                <div className="p-2">
                  <div className="space-y-2">
                    {autoDetectedColumns.map((column) => (
                      <Button
                        key={column.key}
                        variant={
                          groupByField === column.key ? "default" : "ghost"
                        }
                        size="sm"
                        className="w-full justify-start"
                        onClick={() =>
                          setGroupByField(
                            groupByField === column.key ? null : column.key,
                          )
                        }
                      >
                        {column.label}
                      </Button>
                    ))}

                    {groupByField ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => setGroupByField(null)}
                      >
                        Clear grouping
                      </Button>
                    ) : null}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          ) : null}

          {appliedTags.length > 0 || groupByField || searchQuery ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterState({ logicOperator: "AND", rules: [] })
                setActiveFilters({ logicOperator: "AND", rules: [] })
                setAppliedTags([])
                setGroupByField(null)
                setSearchQuery("")
              }}
            >
              Clear all filters
            </Button>
          ) : null}

          {toolbarActions}
        </div>
        </>
      }
      footer={paginationFooter}
    >
      <div className="table-surface">
        <Table className="w-full border-separate border-spacing-0">
          <TableHeader>
            <TableRow className="table-head-row hover:bg-transparent">
                  {autoDetectedColumns.map((column) => (
                    <TableHead
                      key={column.key}
                      className={`table-head-cell ${
                        column.sortable && sortable
                          ? "cursor-pointer select-none"
                          : ""
                      }`}
                      onClick={() =>
                        column.sortable &&
                        sortable &&
                        handleSort(column.key)
                      }
                    >
                      <div className="flex items-center space-x-1">
                        <span>{column.label}</span>
                        {sortable &&
                          column.sortable &&
                          sortConfig?.key === column.key &&
                          (sortConfig.direction === "asc" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          ))}
                        {groupByField === column.key ? (
                          <Badge
                            variant="outline"
                            className="ml-2 h-5 px-1.5 normal-case tracking-normal"
                          >
                            Grouped
                          </Badge>
                        ) : null}
                      </div>
                    </TableHead>
                  ))}
                  {rowActions ? (
                    <TableHead className="table-head-cell w-[1%] whitespace-nowrap text-right">
                      Actions
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((row, rowIndex) =>
                  isGroupRow(row) ? (
                    <TableRow
                      key={`group-${row.__groupKey}-${rowIndex}`}
                      className="table-body-row"
                    >
                      <TableCell
                        colSpan={columnCount}
                        className="table-body-cell"
                      >
                        <Collapsible
                          open={expandedGroups.includes(row.__groupKey)}
                          onOpenChange={(isOpen) => {
                            setExpandedGroups((prev) =>
                              isOpen
                                ? [...prev, row.__groupKey]
                                : prev.filter(
                                    (key) => key !== row.__groupKey,
                                  ),
                            )
                          }}
                        >
                          <CollapsibleTrigger className="flex w-full items-center">
                            <ChevronRight
                              className={`mr-2 h-4 w-4 transition-transform ${
                                expandedGroups.includes(row.__groupKey)
                                  ? "rotate-90 transform"
                                  : ""
                              }`}
                            />
                            <span className="font-medium">
                              {row.__groupField}: {row.__groupKey} (
                              {row.__itemCount} items)
                            </span>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="mt-2">
                              <Table>
                                <TableBody>
                                  {row.__items.map((item, itemIndex) => (
                                    <TableRow
                                      key={`${rowIndex}-${itemIndex}`}
                                      className="table-body-row"
                                    >
                                      {autoDetectedColumns.map((column) => {
                                        const type =
                                          column.type ||
                                          detectDataType(item[column.key])
                                        return (
                                          <TableCell
                                            key={`${rowIndex}-${itemIndex}-${column.key}`}
                                            className="table-body-cell"
                                          >
                                            {column.format
                                              ? column.format(
                                                  item[column.key],
                                                )
                                              : renderCellValue(
                                                  item,
                                                  column.key,
                                                  type,
                                                )}
                                          </TableCell>
                                        )
                                      })}
                                      {rowActions ? (
                                        <TableCell className="table-body-cell text-right">
                                          <div className="flex items-center justify-end gap-1">
                                            {rowActions({ row: item })}
                                          </div>
                                        </TableCell>
                                      ) : null}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow
                      key={String(row.id ?? rowIndex)}
                      className="table-body-row"
                    >
                      {autoDetectedColumns.map((column) => {
                        const type =
                          column.type || detectDataType(row[column.key])
                        return (
                          <TableCell
                            key={`${rowIndex}-${column.key}`}
                            className="table-body-cell"
                          >
                            {column.format
                              ? column.format(row[column.key])
                              : renderCellValue(row, column.key, type)}
                          </TableCell>
                        )
                      })}
                      {rowActions ? (
                        <TableCell className="table-body-cell text-right">
                          <div className="flex items-center justify-end gap-1">
                            {rowActions({ row })}
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
      </div>
    </DataTableFrame>
  )
}

export default DynamicTable
