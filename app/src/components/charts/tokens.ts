'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

/**
 * The design tokens the Recharts panels need, resolved off the live document.
 *
 * Recharts writes `fill` and `stroke` as SVG presentation attributes, and
 * `var(--t1)` in a presentation attribute does not resolve. Hard-coding the
 * hexes in each chart would let them drift from globals.css, so the tokens are
 * read from the document at runtime and re-read whenever the theme flips. One
 * source of truth, and the charts follow dark mode for free.
 */
export interface ChartTokens {
  t1: string
  gap: string
  grid: string
  axis: string
  tooltipBg: string
  tooltipBorder: string
  ink: string
  ink3: string
}

/**
 * Light-mode values from globals.css. Only ever used for the single frame before
 * the effect runs (and in a non-DOM environment); the effect immediately
 * replaces them with whatever the document actually computes.
 */
export const FALLBACK: ChartTokens = {
  t1: '#0E7490',
  gap: '#B45309',
  grid: '#DCE3E3',
  axis: '#4F5B5D',
  tooltipBg: '#FFFFFF',
  tooltipBorder: '#DCE3E3',
  ink: '#0A0F10',
  ink3: '#4F5B5D',
}

export function readChartTokens(): ChartTokens {
  if (typeof window === 'undefined') return FALLBACK
  const cs = getComputedStyle(document.documentElement)
  const get = (name: string, fallback: string) =>
    cs.getPropertyValue(name).trim() || fallback
  return {
    t1: get('--t1', FALLBACK.t1),
    gap: get('--gap', FALLBACK.gap),
    grid: get('--chart-grid', FALLBACK.grid),
    axis: get('--chart-axis', FALLBACK.axis),
    tooltipBg: get('--chart-tooltip-bg', FALLBACK.tooltipBg),
    tooltipBorder: get('--chart-tooltip-border', FALLBACK.tooltipBorder),
    ink: get('--ink', FALLBACK.ink),
    ink3: get('--ink-3', FALLBACK.ink3),
  }
}

export function useChartTokens(): ChartTokens {
  const { resolvedTheme } = useTheme()
  const [tokens, setTokens] = useState<ChartTokens>(FALLBACK)

  useEffect(() => {
    setTokens(readChartTokens())
  }, [resolvedTheme])

  return tokens
}
