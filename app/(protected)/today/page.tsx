'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { fmtDate } from '@/lib/fmtDate'
import { usePolling } from '@/lib/usePolling'

const fmt = (v: any) => `₵${Number(v ?? 0).toLocaleString('en-GH', { maximumFractionDigits: 0 })}`

function Card({ title, children, href, linkLabel }: { title: string; children: React.ReactNode; href?: string; linkLabel?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        {href && (
          <Link href={href} className="text-xs text-blue-600 font-semibold hover:underline">
            {linkLabel ?? 'View →'}
          </Link>
        )}
      </div>
      {children}
    </div>
  )
}

export default function TodayPage() {
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  function load() {
    fetch('/api/today/summary')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])
  usePolling(load, 10000)

  if (loading) return <div className="py-10 text-center text-gray-400">Loading…</div>
  if (!data) return <div className="py-10 text-center text-gray-400">Could not load today's summary.</div>

  const sales = data.sales ?? {}
  const bills = data.bills ?? {}
  const expenses = data.expenses ?? {}

  return (
    <div className="py-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Today</h1>
        <p className="text-sm text-gray-400">{fmtDate(data.date)}</p>
      </div>

      <Card title="Sales" href="/sales">
        <div className="flex gap-2">
          <div className="flex-1 bg-blue-50 rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-400">Total</p>
            <p className="text-base font-bold text-blue-700">{fmt(sales.total)}</p>
          </div>
          <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-400">WIC</p>
            <p className="text-sm font-semibold text-gray-700">{fmt(sales.wic)}</p>
          </div>
          <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-400">GMC</p>
            <p className="text-sm font-semibold text-gray-700">{fmt(sales.gmc)}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400">{sales.count ?? 0} receipt{Number(sales.count) !== 1 ? 's' : ''} today</p>
        <Link href="/sales/new" className="inline-block text-xs font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-500">
          + New Sale
        </Link>
      </Card>

      <Card title="Bills" href="/bills">
        <div className="flex items-center justify-between">
          <p className="text-base font-bold text-orange-600">{fmt(bills.total)}</p>
          <p className="text-xs text-gray-400">{bills.count ?? 0} bill{Number(bills.count) !== 1 ? 's' : ''} today</p>
        </div>
      </Card>

      <Card title="Expenses" href="/expenses">
        <div className="flex items-center justify-between">
          <p className="text-base font-bold text-red-500">{fmt(expenses.total)}</p>
          <p className="text-xs text-gray-400">{expenses.count ?? 0} entr{Number(expenses.count) === 1 ? 'y' : 'ies'} today</p>
        </div>
      </Card>

      <Card title="Stock Counting" href="/stock/counts?tab=Daily" linkLabel="Count Now →">
        {data.pendingDailyCount > 0 ? (
          <p className="text-sm text-gray-700">
            <span className="font-bold text-orange-600">{data.pendingDailyCount}</span> daily item{data.pendingDailyCount !== 1 ? 's' : ''} still need counting today
          </p>
        ) : (
          <p className="text-sm text-green-600 font-medium">All daily items counted ✓</p>
        )}
      </Card>

      <Card title="Staff Today" href="/staff">
        {(!data.staffToday || data.staffToday.length === 0) ? (
          <p className="text-sm text-gray-400">No one has clocked in yet.</p>
        ) : (
          <div className="space-y-1.5">
            {data.staffToday.map((s: any) => (
              <div key={s.staff_name} className="flex items-center justify-between text-sm">
                <span className="font-medium capitalize text-gray-700">{s.staff_name}</span>
                <span className="text-xs text-gray-500">
                  <span className="text-green-700">{s.actual_in ?? '—'}</span>
                  {' → '}
                  <span className="text-orange-600">{s.actual_out ?? '—'}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Cash at Bank" href="/cash-at-bank">
        {data.latestCab ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Last confirmed: {fmtDate(String(data.latestCab.entry_date).slice(0,10))}</span>
            <span className={`font-semibold ${Number(data.latestCab.deficit) < 0 ? 'text-red-500' : 'text-green-600'}`}>
              {data.latestCab.deficit != null ? fmt(data.latestCab.deficit) : ''}
            </span>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No confirmed cash-at-bank entry yet.</p>
        )}
      </Card>
    </div>
  )
}
