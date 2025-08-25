import { useEffect, useState } from "react"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"

interface StartupOverlayProps {
  minimumTimeMs?: number
}

export function StartupOverlay({ minimumTimeMs = 1200 }: StartupOverlayProps) {
  const [mountedAt] = useState<number>(Date.now())
  const [hidden, setHidden] = useState<boolean>(false)
  const isOnline = useOnlineStatus()

  useEffect(() => {
    const onReady = () => {
      const elapsed = Date.now() - mountedAt
      const remaining = Math.max(0, minimumTimeMs - elapsed)
      const t = setTimeout(() => setHidden(true), remaining)
      return () => clearTimeout(t)
    }
    // Hide after minimum time when DOM content loaded
    const done = onReady()
    return () => {
      if (typeof done === 'function') done()
    }
  }, [mountedAt, minimumTimeMs])

  const show = !hidden || !isOnline

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-white/95 dark:bg-black/90">
      <div className="flex flex-col items-center gap-4">
        <img src="/logo.png" alt="GesFlex" className="w-16 h-16 animate-gf-bounce" />
        <div className="relative">
          <h1 className="text-3xl font-extrabold tracking-wide text-[#1e40af] animate-gf-fade">GesFlex</h1>
          {!isOnline && (
            <p className="mt-2 text-center text-sm text-red-600 animate-pulse">
              Vous êtes hors ligne. Vérifiez votre connexion internet.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}


