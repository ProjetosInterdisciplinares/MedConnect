"use client"

import { useEffect, useRef, useState } from "react"

interface UseIsStuckOptions {
  /**
   * Offset superior manual em pixels. Se omitido, lê `--navbar-height` + `--sticky-gap` do CSS.
   */
  topOffset?: number
}

/**
 * Hook reutilizável que detecta quando um elemento atinge o estado 'sticky'
 * usando IntersectionObserver com um elemento sentinela.
 */
export function useIsStuck(options: UseIsStuckOptions = {}) {
  const [isStuck, setIsStuck] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    // Lê o offset dinamicamente do CSS ou das options
    const computeOffset = (): number => {
      if (typeof options.topOffset === "number") return options.topOffset
      if (typeof window === "undefined") return 80

      const rootStyle = getComputedStyle(document.documentElement)
      const navH = parseFloat(rootStyle.getPropertyValue("--navbar-height")) || 64
      const gap = parseFloat(rootStyle.getPropertyValue("--sticky-gap")) || 16
      return navH + gap
    }

    const offset = computeOffset()

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Se não está intersectando e está acima do offset -> está stuck
        const isAbove = entry.boundingClientRect.top <= offset + 2
        setIsStuck(!entry.isIntersecting && isAbove)
      },
      {
        root: null,
        rootMargin: `-${offset}px 0px 0px 0px`,
        threshold: 0,
      }
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [options.topOffset])

  return { isStuck, sentinelRef }
}
