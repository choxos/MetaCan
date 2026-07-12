'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState, useEffect } from 'react'

/**
 * The browse filters.
 *
 * The filter set is not arbitrary. Beyond the ordinary bibliographic facets it
 * exposes ROUTE PROVENANCE, including `no_aff` — the works an affiliation-only
 * frame would never have seen — and the screen's consensus count, because those
 * two are what this frame can answer and a keyword search cannot.
 *
 * State lives in the URL, so every view is a shareable, citable link. That is a
 * requirement, not a nicety: a claim about the frame has to be checkable by
 * someone who was not there when it was made.
 */

export interface Facets {
  langs: string[]
  types: string[]
  fields: string[]
}

const ROUTES = [
  { v: '', label: 'Any route' },
  { v: 'aff', label: 'Canadian affiliation' },
  { v: 'fund', label: 'Canadian funder' },
  { v: 'venue', label: 'Canadian venue' },
  { v: 'about', label: 'About Canada' },
  { v: 'no_aff', label: 'NO affiliation (invisible to the usual frame)' },
] as const

const SORTS = [
  { v: 'cited', label: 'Most cited' },
  { v: 'year_desc', label: 'Newest' },
  { v: 'year_asc', label: 'Oldest' },
] as const

const CONSENSUS = [
  { v: '', label: 'Any' },
  { v: '3', label: '3/3 — all three models' },
  { v: '2', label: '2/3 — contested' },
  { v: '1', label: '1/3 — one model only' },
  { v: '0', label: '0/3 — all three said out' },
] as const

export function Filters({ facets }: { facets: Facets }) {
  const router = useRouter()
  const sp = useSearchParams()

  // The text box is controlled locally so typing does not fire a query per
  // keystroke against a four-million-row table; it commits on submit.
  const [q, setQ] = useState(sp.get('q') ?? '')
  useEffect(() => setQ(sp.get('q') ?? ''), [sp])

  const push = useCallback(
    (over: Record<string, string | undefined>) => {
      const p = new URLSearchParams(sp.toString())
      for (const [k, v] of Object.entries(over)) {
        if (v === undefined || v === '') p.delete(k)
        else p.set(k, v)
      }
      // Any filter change invalidates the current page offset.
      p.delete('page')
      router.push(`/works?${p.toString()}`)
    },
    [router, sp],
  )

  const val = (k: string) => sp.get(k) ?? ''
  const active = Array.from(sp.keys()).filter((k) => k !== 'page' && sp.get(k)).length

  return (
    <div className="card p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          push({ q: q.trim() || undefined })
        }}
        className="flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search titles — full-text over 4,299,418 works"
          aria-label="Search titles"
          className="flex-1 rounded-md border px-3 py-2 text-sm"
          style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
        />
        <button
          type="submit"
          className="rounded-md px-4 py-2 text-sm font-medium text-white"
          style={{ background: 'var(--mc)' }}
        >
          Search
        </button>
      </form>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select label="Route" value={val('route')} onChange={(v) => push({ route: v })}>
          {ROUTES.map((r) => (
            <option key={r.v} value={r.v}>
              {r.label}
            </option>
          ))}
        </Select>

        <Select label="Field" value={val('field')} onChange={(v) => push({ field: v })}>
          <option value="">Any field</option>
          {facets.fields.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Select>

        <Select label="Type" value={val('type')} onChange={(v) => push({ type: v })}>
          <option value="">Any type</option>
          {facets.types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>

        <Select label="Language" value={val('lang')} onChange={(v) => push({ lang: v })}>
          <option value="">Any language</option>
          {facets.langs.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>

        <div>
          <Label>Year range</Label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="from"
              defaultValue={val('year_from')}
              onBlur={(e) => push({ year_from: e.target.value || undefined })}
              aria-label="Year from"
              className="tabular w-full rounded-md border px-2 py-1.5 text-sm"
              style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
            />
            <span style={{ color: 'var(--ink-5)' }}>–</span>
            <input
              type="number"
              placeholder="to"
              defaultValue={val('year_to')}
              onBlur={(e) => push({ year_to: e.target.value || undefined })}
              aria-label="Year to"
              className="tabular w-full rounded-md border px-2 py-1.5 text-sm"
              style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
            />
          </div>
        </div>

        <Select label="Screen consensus" value={val('n_in')} onChange={(v) => push({ n_in: v })}>
          {CONSENSUS.map((c) => (
            <option key={c.v} value={c.v}>
              {c.label}
            </option>
          ))}
        </Select>

        <Select label="Sort" value={val('sort') || 'cited'} onChange={(v) => push({ sort: v })}>
          {SORTS.map((s) => (
            <option key={s.v} value={s.v}>
              {s.label}
            </option>
          ))}
        </Select>

        <div>
          <Label>Flags</Label>
          <div className="flex items-center gap-4 pt-1.5">
            <Check
              checked={val('retracted') === '1'}
              onChange={(c) => push({ retracted: c ? '1' : undefined })}
              label="Retracted"
            />
            <Check
              checked={val('no_abstract') === '1'}
              onChange={(c) => push({ no_abstract: c ? '1' : undefined })}
              label="No abstract"
            />
          </div>
        </div>
      </div>

      {active > 0 && (
        <div className="mt-3 flex items-center gap-3 border-t pt-3 text-xs" style={{ color: 'var(--ink-4)' }}>
          <span>
            {active} filter{active === 1 ? '' : 's'} active
          </span>
          <button onClick={() => router.push('/works')} className="link" style={{ color: 'var(--mc)' }}>
            clear all
          </button>
        </div>
      )}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 text-xs uppercase tracking-wider" style={{ color: 'var(--ink-4)' }}>
      {children}
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <div>
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="w-full rounded-md border px-2 py-1.5 text-sm"
        style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
      >
        {children}
      </select>
    </div>
  )
}

function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (c: boolean) => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: 'var(--mc)' }}
      />
      {label}
    </label>
  )
}
