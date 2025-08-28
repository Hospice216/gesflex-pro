import { useEffect, useMemo, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Search, X, History, CornerDownLeft } from "lucide-react"

type Suggestion = { id: string; label: string }

interface AdvancedSearchBarProps {
  value?: string
  onSearch: (query: string) => void
  placeholder?: string
  debounceMs?: number
  storageKey?: string
  staticSuggestions?: Suggestion[]
  className?: string
}

export function AdvancedSearchBar({
  value,
  onSearch,
  placeholder = "Rechercher...",
  debounceMs = 250,
  storageKey = "gesflex.search.recent",
  staticSuggestions,
  className,
}: AdvancedSearchBarProps) {
  const [query, setQuery] = useState<string>(value ?? "")
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState<number>(-1)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Load/save recent queries
  const loadRecent = (): Suggestion[] => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return []
      const arr = JSON.parse(raw) as Suggestion[]
      return Array.isArray(arr) ? arr.slice(0, 10) : []
    } catch {
      return []
    }
  }
  const [recent, setRecent] = useState<Suggestion[]>(loadRecent())

  const saveRecent = (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return
    const next: Suggestion[] = [
      { id: trimmed.toLowerCase(), label: trimmed },
      ...recent.filter(r => r.id !== trimmed.toLowerCase()),
    ].slice(0, 10)
    setRecent(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch {}
  }

  // Debounced onSearch
  useEffect(() => {
    const t = setTimeout(() => onSearch(query), debounceMs)
    return () => clearTimeout(t)
  }, [query, debounceMs, onSearch])

  // Sync external value
  useEffect(() => {
    if (value !== undefined) setQuery(value)
  }, [value])

  const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  const suggestions = useMemo(() => {
    const base = staticSuggestions || []
    const combined = [...base, ...recent.filter(r => !base.some(b => b.id === r.id))]
    if (!query) return combined
    const q = normalize(query)
    return combined.filter(s => normalize(s.label).includes(q))
  }, [staticSuggestions, recent, query])

  const highlight = (label: string) => {
    if (!query) return label
    const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`(${q})`, 'ig')
    return label.split(re).map((part, i) => (
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className="bg-yellow-200/60 rounded px-0.5">{part}</mark>
        : <span key={i}>{part}</span>
    ))
  }

  const applySuggestion = (s: Suggestion) => {
    setQuery(s.label)
    onSearch(s.label)
    setOpen(false)
    saveRecent(s.label)
    inputRef.current?.blur()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(query)
    saveRecent(query)
    setOpen(false)
  }

  const clear = () => {
    setQuery("")
    onSearch("")
    setOpen(false)
    inputRef.current?.focus()
    setActiveIdx(-1)
  }

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="relative" role="search">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIdx(-1) }}
              placeholder={placeholder}
              className="pl-10 pr-16 h-10 sm:h-12 text-sm sm:text-base"
              type="search"
              autoCorrect="off"
              autoCapitalize="off"
              autoComplete="off"
              enterKeyHint="search"
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                  setOpen(true)
                }
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setActiveIdx((idx) => Math.min((suggestions.length - 1), idx + 1))
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setActiveIdx((idx) => Math.max(-1, idx - 1))
                } else if (e.key === 'Enter') {
                  if (activeIdx >= 0 && activeIdx < suggestions.length) {
                    e.preventDefault()
                    applySuggestion(suggestions[activeIdx])
                  }
                } else if (e.key === 'Escape') {
                  setOpen(false)
                }
              }}
            />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[min(92vw,560px)] p-0">
            <div className="max-h-64 overflow-auto" role="listbox" aria-activedescendant={activeIdx >= 0 ? suggestions[activeIdx]?.id : undefined}>
              {suggestions.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">Aucune suggestion</div>
              ) : suggestions.map((s, i) => (
                <button
                  key={s.id}
                  id={s.id}
                  type="button"
                  onMouseEnter={() => setActiveIdx(i)}
                  onMouseLeave={() => setActiveIdx(-1)}
                  onClick={() => applySuggestion(s)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${i === activeIdx ? 'bg-accent/60' : 'hover:bg-accent/50'}`}
                  role="option"
                  aria-selected={i === activeIdx}
                >
                  <History className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="truncate">{highlight(s.label)}</span>
                  <CornerDownLeft className="ml-auto w-3.5 h-3.5 text-muted-foreground" />
                </button>
              ))}
            </div>
            <div className="px-3 py-2 border-t text-[11px] text-muted-foreground">Astuce: ↑/↓ naviguer, Entrée valider, Échap fermer</div>
          </PopoverContent>
        </Popover>
        {query && (
          <Button type="button" variant="ghost" size="icon" onClick={clear} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        )}
      </form>
    </div>
  )
}


