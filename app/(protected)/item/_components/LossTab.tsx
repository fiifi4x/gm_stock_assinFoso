'use client'
import { useState, useEffect, useMemo } from 'react'

type Row = {
  item_id: number
  item_name: string
  cf_group: string | null
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
  return (v > 0 ? '+' : '') + fmtQ(Math.abs(v))
}

export default function LossTab({ onOpenItem }: { onOpenItem: (itemId: number) => void }) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/losses/summary').then(r => r.json())
      .then(d => { setRows(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return !q ? rows : rows.filter(r =>
      r.item_name.toLowerCase().includes(q) ||
      (r.cf_group ?? '').toLowerCase().includes(q)
    )
  }, [rows, search])

  if (loading) return <div className="py-20 text-center text-gray-400">Loading…</div>

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <input
        type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search item or group…"
        className="shrink-0 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm
          text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-400 max-w-xs"
      />

      <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold">
              <th className="sticky left-0 bg-gray-50 px-3 py-2 text-left whitespace-nowrap">Item</th>
              <th className="px-3 py-2 text-right whitespace-nowrap">₵ L/G</th>
              <th className="px-3 py-2 text-right whitespace-nowrap">L/G</th>
              <th className="px-3 py-2 text-right whitespace-nowrap">CNT</th>
              <th className="px-3 py-2 text-right whitespace-nowrap">WIC</th>
              <th className="px-3 py-2 text-right whitespace-nowrap">GMC</th>
              <th className="px-3 py-2 text-right whitespace-nowrap">BL</th>
              <th className="px-3 py-2 text-right whitespace-nowrap">SOH</th>
              <th className="px-3 py-2 text-right whitespace-nowrap">SP</th>
              <th className="px-3 py-2 text-right whitespace-nowrap">CP</th>
              <th className="px-3 py-2 text-center whitespace-nowrap"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="py-12 text-center text-gray-400">No items found</td>
              </tr>
            )}
            {filtered.map(row => {
              const lossAmt = row.lgAmt > 0
              const gainAmt = row.lgAmt < 0
              const lossQty = row.lgQty > 0
              const gainQty = row.lgQty < 0
              const soh = parseFloat(row.soh ?? '0') || 0
              return (
                <tr key={row.item_id} className="hover:bg-gray-50 transition">
                  <td className="sticky left-0 bg-white hover:bg-gray-50 px-3 py-2 font-medium text-gray-900 max-w-[180px]">
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
                      className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100 transition whitespace-nowrap">
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
