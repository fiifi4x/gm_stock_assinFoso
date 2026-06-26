import { useEffect, useRef } from 'react'

/**
 * Repeatedly calls `callback` every `intervalMs`, without resetting the
 * interval when `callback` itself changes identity (avoids re-render churn).
 * Pass `enabled = false` to pause polling (e.g. while the user is mid-edit).
 */
export function usePolling(callback: () => void, intervalMs = 5000, enabled = true) {
  const cbRef = useRef(callback)
  cbRef.current = callback

  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => cbRef.current(), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, enabled])
}
