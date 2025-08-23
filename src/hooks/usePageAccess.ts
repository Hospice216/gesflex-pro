import { useCallback, useEffect, useMemo, useState } from 'react'
import { getDefaultAccessForRole, pagesConfig, PageKey, UserRole } from '@/config/pages'

type AccessMap = Record<PageKey, boolean>

function storageKey(userId: string) {
  return `pageAccess:${userId}`
}

export function usePageAccess(userId?: string, role?: UserRole) {
  const defaults: AccessMap | null = useMemo(() => {
    return role ? getDefaultAccessForRole(role) : null
  }, [role])

  const [overrides, setOverrides] = useState<Partial<AccessMap>>({})

  // Load overrides
  useEffect(() => {
    if (!userId) return
    try {
      const raw = localStorage.getItem(storageKey(userId))
      if (raw) setOverrides(JSON.parse(raw))
      else setOverrides({})
    } catch {
      setOverrides({})
    }
  }, [userId])

  const access: AccessMap | null = useMemo(() => {
    if (!defaults) return null
    const merged: Partial<AccessMap> = { ...defaults, ...overrides }
    return merged as AccessMap
  }, [defaults, overrides])

  const isAllowed = useCallback((key: PageKey) => {
    if (!access) return false
    return !!access[key]
  }, [access])

  const setAllowed = useCallback((key: PageKey, value: boolean) => {
    if (!userId) return
    setOverrides(prev => {
      const next = { ...prev, [key]: value }
      try { localStorage.setItem(storageKey(userId), JSON.stringify(next)) } catch {}
      return next
    })
  }, [userId])

  const setMany = useCallback((entries: Partial<AccessMap>) => {
    if (!userId) return
    setOverrides(prev => {
      const next = { ...prev, ...entries }
      try { localStorage.setItem(storageKey(userId), JSON.stringify(next)) } catch {}
      return next
    })
  }, [userId])

  return { access, isAllowed, setAllowed, setMany, pagesConfig }
}


