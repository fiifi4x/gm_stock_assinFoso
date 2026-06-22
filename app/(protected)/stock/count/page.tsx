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

export default function StockCountPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/stock/overdue')
      .then(r => r.json())
      .then(data => { setItems(data); setLoading(false) })
  }, [])

  async function submit(item: Item, qty: number) {
    setSaving(item.item_id)
    const res = await fetch('/api/stock/count', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.item_id, qty, notes: '' }),
    })
    setSaving(null)
    if (res.ok) setItems(prev => prev.filter(i => i.item_id !== item.item_id))
  }

  if (loading) return (
    <div className="py-20 text-center text-gray-400">Loading items…</div>
  )

  if (items.length === 0) return (
    <div className="py-20 text-center space-y-3">
      <p className="text-5xl">✅</p>
      <p className="text-white font-semibold text-lg">All items counted!</p>
      <p className="text-gray-500 text-sm">No items overdue for counting.</p>
    </div>
  )

  return (
    <div className="py-4 space-y-3">
      <div>
        <h1 className="text-xl font-bold">Stock Count</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {items.length} item{items.length !== 1 ? 's' : ''} overdue · tap to count
        </p>
      </div>

      {items.map(item => {
        const soh = Number(item.calculated_soh)
        const overdue = item.days_overdue
        const isSaving = saving === item.item_id
        const customQty = counts[item.item_id] ?? ''

        return (
          <div key={item.item_id}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">

            {/* Header row: name + overdue badge */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white font-medium leading-snug">{item.item_name}</p>
                {item.cf_group && (
                  <p className="text-gray-500 text-xs mt-0.5">{item.cf_group}</p>
                )}
              </div>
              <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full
                ${overdue === null
                  ? 'bg-orange-900/60 text-orange-300'
                  : 'bg-red-900/60 text-red-300'}`}>
                {overdue === null ? 'Never counted' : `${overdue}d overdue`}
              </span>
            </div>

            {/* SOH */}
            <p className="text-sm text-gray-400">
              Stock on hand: <span className="text-white font-semibold text-base">{soh}</span>
            </p>

            {/* Count actions */}
            <div className="flex items-center gap-2">
              {/* Same button */}
              <button
                onClick={() => submit(item, soh)}
                disabled={isSaving}
                className="flex-1 bg-green-700 hover:bg-green-600 active:bg-green-800 disabled:opacity-40
                  text-white text-sm font-semibold rounded-xl py-3 transition">
                {isSaving ? 'Saving…' : `✓ Same (${soh})`}
              </button>

              {/* Different count input */}
              <input
                type="number" min="0" step="any"
                value={customQty}
                onChange={e => setCounts(p => ({ ...p, [item.item_id]: e.target.value }))}
                placeholder="New qty"
                inputMode="decimal"
                className="w-24 bg-gray-800 border border-gray-700 rounded-xl px-2 py-3
                  text-base text-white placeholder-gray-600 outline-none
                  focus:ring-2 focus:ring-blue-500 text-center"
              />
              <button
                onClick={() => { if (customQty !== '') submit(item, Number(customQty)) }}
                disabled={customQty === '' || isSaving}
                className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-30
                  text-white text-sm font-semibold rounded-xl px-4 py-3 transition">
                Save
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
