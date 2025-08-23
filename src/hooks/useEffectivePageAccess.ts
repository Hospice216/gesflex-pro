import { useMemo } from 'react'
import { useManagePageAccess } from '@/hooks/useManagePageAccess'
import { UserRole } from '@/config/pages'

export function useEffectivePageAccess(userId?: string, role?: UserRole) {
  const { loading, error, store, getEffectiveAccess } = useManagePageAccess()

  const access = useMemo(() => {
    if (!userId || !role) return null
    return getEffectiveAccess(userId, role)
  }, [store, userId, role, getEffectiveAccess])

  return { loading, error, access }
}


