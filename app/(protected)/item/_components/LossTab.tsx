'use client'
import { useState, useEffect, useMemo, useRef } from 'react'

type Row = {
  item_id: number
  item_name: string
  cf_group: string | null
  product_type: string | null
  soh: string | null
  sp: string | null
  cp: string | null
  lgAmt: number
  lgQty: number
  cnt: number
  wic: number
  gmc: number
  bl: number
}

type SortCol = 'item_name' | 'lgAmt' | 'lgQty' | 'cnt' | 'wic' | 'gmc' | 'bl' | 'soh' | 'sp' | 'cp'
type SortDir = 'asc' | 'desc'

function fmtQ(v: number) {
  if (v === 0) return '—'
  return v % 1 === 0 ? String(v) : v.toFixed(4).replace(/\.?0+$/, '')
}
function fmtCcy(v: string | null) {
  if (!v) return '—'
  const x = parseFloat(v)
  return isNaN(x) ? '—' : `₵${x.toFixed(2)}`
}
function fmtAmt(v: number) {
  if (v === 0) return '—'
  return (v > 0 ? '+' : '') + '₵' + Math.abs(v).toFixed(2)
}
function fmtLg(v: number) {
  if (v === 0) return '—'
  return (v > 0 ? '+' : '-') + fmtQ(Math.abs(v))
}

function rowVal(row: Row, col: SortCol): number | string {
  switch (col) {
    case 'item_name': return row.item_name.toLowerCase()
    case 'lgAmt': return row.lgAmt
    case 'lgQty': return row.lgQty
    case 'cnt': return row.cnt
    case 'wic': return row.wic
    case 'gmc': return row.gmc
    case 'bl': return row.bl
    case 'soh': return parseFloat(row.soh ?? '0') || 0
    case 'sp': return parseFloat(row.sp ?? '0') || 0
    case 'cp': return parseFloat(row.cp ?? '0') || 0
  }
}

function SortTh({ label, col, sort, onSort, right = true }: {
  label: string; col: SortCol
  sort: { col: SortCol; dir: SortDir }
  onSort: (col: SortCol) => void
  right?: boolean
}) {
  const active = sort.col === col
  const arrow = active ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : ''
  return (
    <th
      onClick={() => onSort(col)}
      className={`px-3 py-2 whitespace-nowrap cursor-pointer select-none transition
        ${right ? 'text-right' : 'text-left'}
        ${active ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>
      {label}{arrow}
    </th>
  )
}

export default function LossTab({ onOpenItem }: { onOpenItem: (itemId: number) => void }) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState<string>('All')
  const [productType, setProductType] = useState<'all' | 'goods' | 'services'>('all')
  const [groupOpen, setGroupOpen] = useState(false)
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: 'lgAmt', dir: 'desc' })
  const groupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/losses/summary').then(r => r.json())
      .then(d => { setRows(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) setGroupOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleSort(col: SortCol) {
    setSort(s => s.col === col
      ? { col, dir: s.dir === 'desc' ? 'asc' : 'desc' }
      : { col, dir: col === 'item_name' ? 'asc' : 'desc' }
    )
  }

  const groups = useMemo(() =>
    ['All', ...Array.from(new Set(rows.map(r => r.cf_group ?? 'Ungrouped'))).sort()]
  , [rows])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const list = rows.filter(r => {
      if (q && !r.item_name.toLowerCase().includes(q) && !(r.cf_group ?? '').toLowerCase().includes(q)) return false
      if (group !== 'All' && (r.cf_group ?? 'Ungrouped') !== group) return false
      if (productType === 'services' && r.product_type !== 'service') return false
      if (productType === 'goods' && r.product_type === 'service') return false
      return true
    })
    const dir = sort.dir === 'desc' ? -1 : 1
    list.sort((a, b) => {
      const av = rowVal(a, sort.col), bv = rowVal(b, sort.col)
      if (typeof av === 'string') return dir * av.localeCompare(bv as string)
      return dir * ((av as number) - (bv as number))
    })
    return list
  }, [rows, search, group, productType, sort])

  if (loading) return <div className="py-20 text-center text-gray-400">Loading…</div>

  const hasFilter = group !== 'All' || productType !== 'all'
  const groupLabel = [
    group,
    productType !== 'all' ? (productType === 'goods' ? 'Goods' : 'Services') : null,
  ].filter(Boolean).join(' · ')

  const thProps = { sort, onSort: handleSort }

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      {/* Controls row */}
      <div className="shrink-0 flex gap-2 items-center flex-wrap">
        <div className="relative" ref={groupRef}>
          <button
            onClick={() => setGroupOpen(o => !o)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1 transition
              ${hasFilter ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {groupLabel} <span className="text-[10px]">▾</span>
          </button>
          {groupOpen && (
            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 min-w-[160px] py-1">
              {groups.map(g => (
                <button key={g} onClick={() => { setGroup(g); setGroupOpen(false) }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50
                    ${g === group ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}>
                  {g}
                </button>
              ))}
              <div className="border-t border-gray-100 mt-1 pt-1">
                {(['all', 'goods', 'services'] as const).map(t => (
                  <button key={t} onClick={() => { setProductType(t); setGroupOpen(false) }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50
                      ${productType === t ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}>
                    {t === 'all' ? 'All types' : t === 'goods' ? 'Goods' : 'Services'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search item or group…"
          className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs
            text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-400 w-52"
        />
        <span className="text-[10px] text-gray-400 ml-auto">{filtered.length} items</span>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 font-semibold">
              <th className="px-3 py-2 text-left text-gray-500 whitespace-nowrap w-7">#</th>
              <SortTh label="Item" col="item_name" right={false} {...thProps} />
              <SortTh label="₵ L/G" col="lgAmt" {...thProps} />
              <SortTh label="L/G" col="lgQty" {...thProps} />
              <SortTh label="CNT" col="cnt" {...thProps} />
              <SortTh label="WIC" col="wic" {...thProps} />
              <SortTh label="GMC" col="gmc" {...thProps} />
              <SortTh label="BL" col="bl" {...thProps} />
              <SortTh label="SOH" col="soh" {...thProps} />
              <SortTh label="SP" col="sp" {...thProps} />
              <SortTh label="CP" col="cp" {...thProps} />
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="py-12 text-center text-gray-400">No items found</td>
              </tr>
            )}
            {filtered.map((row, idx) => {
              const lossAmt = row.lgAmt > 0, gainAmt = row.lgAmt < 0
              const lossQty = row.lgQty > 0, gainQty = row.lgQty < 0
              const soh = parseFloat(row.soh ?? '0') || 0
              return (
                <tr key={row.item_id} className="hover:bg-gray-50 transition">
                  <td className="px-3 py-2 text-gray-400 tabular-nums">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium text-gray-900 max-w-[180px]">
                    <p className="truncate">{row.item_name}</p>
                    {row.cf_group && <p className="text-[10px] text-gray-400 truncate">{row.cf_group}</p>}
                  </td>
                  <td className={`px-3 py-2 text-right font-semibold tabular-nums ${lossAmt ? 'text-red-600' : gainAmt ? 'text-green-600' : 'text-gray-400'}`}>
                    {fmtAmt(row.lgAmt)}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${lossQty ? 'text-red-500' : gainQty ? 'text-green-600' : 'text-gray-400'}`}>
                    {fmtLg(row.lgQty)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700 tabular-nums">{fmtQ(row.cnt)}</td>
                  <td className="px-3 py-2 text-right text-gray-700 tabular-nums">{fmtQ(row.wic)}</td>
                  <td className="px-3 py-2 text-right text-gray-700 tabular-nums">{fmtQ(row.gmc)}</td>
                  <td className="px-3 py-2 text-right text-blue-600 tabular-nums">{fmtQ(row.bl)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${soh <= 0 ? 'text-red-500' : 'text-gray-700'}`}>
                    {soh % 1 === 0 ? soh : soh.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right text-blue-600 tabular-nums">{fmtCcy(row.sp)}</td>
                  <td className="px-3 py-2 text-right text-green-600 tabular-nums">{fmtCcy(row.cp)}</td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => onOpenItem(row.item_id)}
                      className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100 transition">
                      →
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
