import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

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
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const currentLabel = useMemo(() => {
    const found = options.find(o => o.value === value)
    return found ? found.label : ''
  }, [options, value])

  // Normalize and filter options (accent-insensitive, lowercase includes)
  const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return options
    return options.filter(opt => {
      const hay = normalize(`${opt.label} ${opt.hintText ?? ''}`)
      return hay.includes(q)
    })
  }, [options, query])

  useEffect(() => {
    if (!open) {
      // Sync query with current label when closed so focus selects it
      setQuery(currentLabel)
      setFocusedIndex(-1)
    }
  }, [open, currentLabel])

  // Keep query aligned when external value changes while closed
  useEffect(() => {
    if (!open) {
      setQuery(currentLabel)
    }
  }, [value, currentLabel, open])

  const handleSelect = (opt: SearchableOption) => {
    onValueChange(opt.value)
    setOpen(false)
    // After selecting, reflect selected label in the input
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.blur()
      }
    })
  }

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (!open && (e.key.length === 1 || e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true)
    }
    if (!open) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex(prev => {
        const next = prev + 1
        return next >= filtered.length ? 0 : next
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex(prev => {
        const next = prev - 1
        return next < 0 ? Math.max(0, filtered.length - 1) : next
      })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const opt = filtered[focusedIndex] || filtered[0]
      if (opt) handleSelect(opt)
    } else if (e.key === 'Tab') {
      const opt = filtered[focusedIndex] || filtered[0]
      if (opt) handleSelect(opt)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  // Display selected label when not searching
  const displayValue = open ? query : currentLabel

  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <Input
          ref={inputRef}
          value={displayValue}
          onChange={(e) => {
            if (!open) setOpen(true)
            setQuery(e.target.value)
          }}
          onFocus={() => {
            if (disabled) return
            setOpen(true)
            // Prefill query with current label so typing edits it directly
            setQuery((prev) => (prev === '' ? currentLabel : prev))
            // Select all to overwrite immediately like Excel
            requestAnimationFrame(() => {
              const len = (inputRef.current?.value || '').length
              inputRef.current?.setSelectionRange?.(0, len)
            })
          }}
          onClick={() => { if (!disabled) setOpen(true) }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={triggerClassName || 'h-10 sm:h-12'}
          readOnly={false}
          type="text"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </PopoverTrigger>
      <PopoverContent
        className="p-0 min-w-[var(--radix-popover-trigger-width)] max-w-[90vw] max-h-64 overflow-auto z-[9998]"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</div>
        ) : (
          <ul role="listbox" className="py-1">
            {filtered.map((opt, idx) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={value === opt.value}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-accent ${idx === focusedIndex ? 'bg-accent' : ''}`}
                onMouseEnter={() => setFocusedIndex(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(opt)}
              >
                <div className="whitespace-normal break-words" title={opt.label}>{opt.label}</div>
                {opt.hintText && (
                  <div className="text-xs text-muted-foreground whitespace-normal break-words" title={opt.hintText}>{opt.hintText}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}

export default SearchableSelect


