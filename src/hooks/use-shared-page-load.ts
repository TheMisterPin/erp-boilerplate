"use client"

import { useEffect, useRef } from "react"

/**
 * Runs `load` once per `key`, reusing the in-flight promise across React
 * Strict Mode's mount → unmount → remount. Pass `false` to skip.
 */
export function useSharedPageLoad(
  key: string | false,
  load: () => Promise<void>,
) {
  const loadRef = useRef(load)
  loadRef.current = load
  const inflightRef = useRef<{ key: string; promise: Promise<void> } | null>(
    null,
  )

  useEffect(() => {
    if (key === false) return

    let inflight = inflightRef.current
    if (!inflight || inflight.key !== key) {
      inflight = { key, promise: loadRef.current() }
      inflightRef.current = inflight
      void inflight.promise.finally(() => {
        if (inflightRef.current === inflight) inflightRef.current = null
      })
    }
  }, [key])
}
