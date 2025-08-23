import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { PageKey, UserRole, getDefaultAccessForRole } from '@/config/pages'

type AccessMap = Record<PageKey, boolean>
type AccessStore = Record<string, Partial<AccessMap>> // userId -> overrides

const SETTING_KEY = 'security.pageAccess'

export function useManagePageAccess() {
  const [loading, setLoading] = useState(true)
  const [store, setStore] = useState<AccessStore>({})
  const [settingId, setSettingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchStore = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('id, setting_value, setting_type')
        .eq('setting_key', SETTING_KEY)
        .maybeSingle()

      if (error) throw error

      setSettingId(data?.id ?? null)

      if (data?.setting_value) {
        const raw = data.setting_value
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
        setStore(parsed || {})
      } else {
        setStore({})
      }
    } catch (e: any) {
      setError(e?.message || 'Erreur de chargement des accès')
      setStore({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStore()
  }, [fetchStore])

  const upsertStore = useCallback(async (next: AccessStore) => {
    const payload = {
      setting_key: SETTING_KEY,
      setting_value: next,
      setting_type: 'json',
      category: 'security',
      updated_at: new Date().toISOString(),
    }

    if (settingId) {
      const { error } = await supabase
        .from('system_settings')
        .update(payload)
        .eq('id', settingId)
      if (error) throw error
    } else {
      const { data, error } = await supabase
        .from('system_settings')
        .insert(payload)
        .select('id')
        .single()
      if (error) throw error
      setSettingId(data.id)
    }
    setStore(next)
  }, [settingId])

  const setSingle = useCallback(async (userId: string, key: PageKey, value: boolean) => {
    const next: AccessStore = { ...store, [userId]: { ...(store[userId] || {}), [key]: value } }
    await upsertStore(next)
  }, [store, upsertStore])

  const setMany = useCallback(async (userId: string, values: Partial<AccessMap>) => {
    const next: AccessStore = { ...store, [userId]: { ...(store[userId] || {}), ...values } }
    await upsertStore(next)
  }, [store, upsertStore])

  const getEffectiveAccess = useCallback((userId: string, role: UserRole): AccessMap => {
    const defaults = getDefaultAccessForRole(role)
    const overrides = store[userId] || {}
    return { ...defaults, ...overrides } as AccessMap
  }, [store])

  return { loading, error, store, fetchStore, setSingle, setMany, getEffectiveAccess }
}


