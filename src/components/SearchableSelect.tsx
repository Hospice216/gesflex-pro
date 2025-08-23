import React, { useMemo, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

export interface SearchableOption {
  value: string
  label: string
  hintText?: string
}

interface SearchableSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SearchableOption[]
  placeholder?: string
  triggerClassName?: string
  disabled?: boolean
  emptyText?: string
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder,
  triggerClassName,
  disabled,
  emptyText = 'Aucun résultat'
}: SearchableSelectProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(opt =>
      opt.label.toLowerCase().includes(q) || (opt.hintText ? opt.hintText.toLowerCase().includes(q) : false)
    )
  }, [query, options])

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={triggerClassName || 'h-10 sm:h-12'}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <div className="p-2 sticky top-0 bg-popover z-10">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher..."
            className="h-9"
          />
        </div>
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</div>
        ) : (
          filtered.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}

export default SearchableSelect


