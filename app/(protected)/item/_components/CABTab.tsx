'use client'
import { useState, useEffect } from 'react'
import { fmtDate } from '@/lib/fmtDate'

type Row = {
  entry_date: string
  cash_counted: number | null
  grony_personal_cash_in: number | null
  debtors_cash_in: number | null
  bills: number | null
  expenses: number | null
  grony_personal_expenses: number | null
  daily_net: number | null
  running_cash_at_bank: number | null
  cab_bank: number | null
  cab_momo: number | null
  cab_physical: number | null
  cab_total: number | null
  deficit: number | null
}

const fmt  = (n: any) => n == null ? '—' : `₵${Number(n).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`
const fmtn = (v: any) => v == null ? '—' : Number(v).toLocaleString('en-GH', { minimumFractionDigits: 0 })
const nz   = (v: any) => (v == null || Number(v) === 0) ? '' : fmtn(v)

export default function CABTab() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [flags, setFlags] = useState<any | null>(null)
  const [flagsLoading, setFlagsLoading] = useState(false)
  const [showWeekly, setShowWeekly] = useState(false)

  useEffect(() => {
    fetch('/api/cash-at-bank')
      .then(r => r.json())
      .then(d => { setRows(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (showWeekly && !flags && !flagsLoading) {
      setFlagsLoading(true)
      fetch('/api/flags')
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(d => { setFlags(d); setFlagsLoading(false) })
        .catch(() => { setFlags({ uncheckedCab: [] }); setFlagsLoading(false) })
    }
  }, [showWeekly, flags, flagsLoading])

  if (loading) return <div className="py-20 text-center text-gray-400 text-xs">Loading…</div>

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-1.5 px-2 py-1 border-b border-gray-200 bg-gray-50 shrink-0">
        <button onClick={() => setShowWeekly(false)}
          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded transition ${!showWeekly ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          List
        </button>
        <button onClick={() => setShowWeekly(true)}
          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded transition ${showWeekly ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          CAB Weekly
          {flags?.uncheckedCab?.length > 0 && (
            <span className="ml-1 bg-red-100 text-red-600 text-[8px] font-bold px-1 py-0.5 rounded-full">{flags.uncheckedCab.length}</span>
          )}
        </button>
      </div>

      {showWeekly ? (
        <div className="flex-1 overflow-y-auto py-2">
          <p className="text-[10px] text-gray-400 px-2 mb-1">
            {flagsLoading || !flags ? 'Loading…' : `${flags.uncheckedCab.length} week${flags.uncheckedCab.length !== 1 ? 's' : ''} with no CAB confirmation`}
          </p>
          {!flagsLoading && flags && (flags.uncheckedCab.length === 0
            ? <p className="py-4 text-center text-gray-400 text-[10px]">All weeks confirmed.</p>
            : <div className="bg-white border-t border-b border-gray-200 divide-y divide-gray-100">
                {flags.uncheckedCab.map((r: any) => (
                  <div key={r.week_start} className="flex items-center justify-between px-2 py-1.5 gap-2">
                    <span className="text-[10px] font-semibold text-gray-900">
                      {fmtDate(r.week_start)} – {fmtDate(r.week_end)}
                    </span>
                    <button onClick={() => setShowWeekly(false)}
                      className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition">
                      View List →
                    </button>
                  </div>
                ))}
              </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Compact table for hub — shows key columns */}
          <table className="w-full border-collapse text-[9px]">
            <thead className="sticky top-0 bg-gray-100 z-10">
              <tr>
                <th className="text-left px-1 py-1 font-semibold text-gray-500 border-b border-gray-200 whitespace-nowrap">DATE</th>
                <th className="text-right px-1 py-1 font-semibold text-gray-500 border-b border-gray-200">CC</th>
                <th className="text-right px-1 py-1 font-semibold text-gray-500 border-b border-gray-200">BL</th>
                <th className="text-right px-1 py-1 font-semibold text-gray-500 border-b border-gray-200">EXP</th>
                <th className="text-right px-1 py-1 font-semibold text-gray-500 border-b border-gray-200">NET</th>
                <th className="text-right px-1 py-1 font-semibold text-gray-500 border-b border-gray-200">RUNNING</th>
                <th className="text-right px-1 py-1 font-semibold text-blue-500 border-b border-gray-200">CAB</th>
                <th className="text-right px-1 py-1 font-semibold text-red-400 border-b border-gray-200">DIFF</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const hasConfirm = r.cab_total != null
                const net = Number(r.daily_net)
                return (
                  <tr key={r.entry_date} className={`border-b border-gray-100 ${hasConfirm ? 'bg-blue-50/60' : ''}`}>
                    <td className="px-1 py-0.5 text-gray-600 whitespace-nowrap">{fmtDate(String(r.entry_date).slice(0,10))}</td>
                    <td className="px-1 py-0.5 text-right text-gray-700">{nz(r.cash_counted)}</td>
                    <td className="px-1 py-0.5 text-right text-red-500">{nz(r.bills)}</td>
                    <td className="px-1 py-0.5 text-right text-red-500">{nz(r.expenses)}</td>
                    <td className={`px-1 py-0.5 text-right font-semibold ${net >= 0 ? 'text-gray-800' : 'text-red-500'}`}>
                      {fmtn(r.daily_net)}
                    </td>
                    <td className="px-1 py-0.5 text-right font-bold text-gray-900">{fmtn(r.running_cash_at_bank)}</td>
                    <td className="px-1 py-0.5 text-right text-blue-600">{hasConfirm ? fmtn(r.cab_total) : ''}</td>
                    <td className={`px-1 py-0.5 text-right font-semibold ${r.deficit != null && Number(r.deficit) < 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {r.deficit != null ? fmtn(r.deficit) : ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p className="text-[10px] text-gray-400 text-center py-10">No data</p>}
        </div>
      )}
    </div>
  )
}
