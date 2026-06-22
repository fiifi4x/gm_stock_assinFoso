'use client'
import { useState, useEffect } from 'react'

type Item = {
  item_id: number
  item_name: string
  cf_group: string | null
  calculated_soh: number
  last_count_date: string | null
  days_overdue: number | null
}

function CountCard({
  item,
  onSaved,
}: {
  item: Item
  onSaved: (id: number) => void
}) {
  const [customQty, setCustomQty] = useState('')
  const [saving, setSaving] = useState(false)
  const soh = Number(item.calculated_soh)

  async function submit(qty: number) {
    setSaving(true)
    const res = await fetch('/api/stock/count', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.item_id, qty, notes: '' }),
    })
    setSaving(false)
    if (res.ok) onSaved(item.item_id)
  }

  const overdue = item.days_overdue
  const badgeClass =
    overdue === null || overdue === 0
      ? 'bg-orange-100 text-orange-600'
      : overdue <= 2
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-red-100 text-red-600'
  const badgeLabel =
    overdue === null ? 'Never counted' : overdue === 0 ? 'Not today' : `${overdue}d overdue`

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-gray-900 font-medium leading-snug">{item.item_name}</p>
          {item.cf_group && (
            <p className="text-gray-400 text-xs mt-0.5">{item.cf_group}</p>
          )}
        </div>
        <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}>
          {badgeLabel}
        </span>
      </div>

      <p className="text-sm text-gray-600">
        Stock on hand: <span className="text-gray-900 font-semibold text-base">{soh}</span>
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={() => submit(soh)}
          disabled={saving}
          className="flex-1 bg-green-700 hover:bg-green-600 active:bg-green-800 disabled:opacity-40
            text-white text-sm font-semibold rounded-xl py-3 transition">
          {saving ? 'Saving…' : `? Same (${soh})`}
        </button>
        <input
          type="number" min="0" step="any"
          value={customQty}
          onChange={e => setCustomQty(e.target.value)}
          placeholder="New qty"
          inputMode="decimal"
          className="w-24 bg-gray-100 border border-gray-300 rounded-xl px-2 py-3
            text-base text-gray-900 placeholder-gray-400 outline-none
            focus:ring-2 focus:ring-blue-400 text-center"
        />
        <button
          onClick={() => { if (customQty !== '') submit(Number(customQty)) }}
          disabled={customQty === '' || saving}
          className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-30
            text-white text-sm font-semibold rounded-xl px-4 py-3 transition">
          Save
        </button>
      </div>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-20 text-center space-y-3">
      <p className="text-5xl">?</p>
      <p className="text-gray-900 font-semibold text-lg">{label}</p>
    </div>
  )
}

export default function StockCountPage() {
  const [tab, setTab] = useState<'daily' | '15day'>('daily')
  const [dailyItems, setDailyItems] = useState<Item[]>([])
  const [overdueItems, setOverdueItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/stock/daily').then(r => r.json()),
      fetch('/api/stock/overdue').then(r => r.json()),
    ]).then(([daily, overdue]) => {
      setDailyItems(daily)
      setOverdueItems(overdue)
      setLoading(false)
    })
  }, [])

  function removeDaily(id: number) {
    setDailyItems(prev => prev.filter(i => i.item_id !== id))
  }
  function removeOverdue(id: number) {
    setOverdueItems(prev => prev.filter(i => i.item_id !== id))
  }

  if (loading) return (
    <div className="py-20 text-center text-gray-600">Loading…</div>
  )

  const items = tab === 'daily' ? dailyItems : overdueItems

  return (
    <div className="py-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Stock Count</h1>
        <p className="text-sm text-gray-600 mt-0.5">
          {dailyItems.length + overdueItems.length} item{dailyItems.length + overdueItems.length !== 1 ? 's' : ''} pending
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl p-1 gap-1">
        <button
          onClick={() => setTab('daily')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition
            ${tab === 'daily'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:text-gray-700'}`}>
          Daily
          {dailyItems.length > 0 && (
            <span className="ml-1.5 bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full">
              {dailyItems.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('15day')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition
            ${tab === '15day'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:text-gray-700'}`}>
          15-Day
          {overdueItems.length > 0 && (
            <span className="ml-1.5 bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full">
              {overdueItems.length}
            </span>
          )}
        </button>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <EmptyState
          label={tab === 'daily' ? 'All daily items counted!' : 'All items up to date!'}
        />
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <CountCard
              key={item.item_id}
              item={item}
              onSaved={tab === 'daily' ? removeDaily : removeOverdue}
            />
          ))}
        </div>
      )}
    </div>
  )
}

