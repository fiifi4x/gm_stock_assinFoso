'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Item = { id: number; name: string; group: string | null; soh: number; selling_price: number }
type CartLine = { item: Item; qty: number; price: number }

export default function NewReceiptPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [customer, setCustomer] = useState('')
  const [cashCounted, setCashCounted] = useState('')
  const [allItems, setAllItems] = useState<Item[]>([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetch('/api/items/all')
      .then(r => r.json())
      .then(d => { setAllItems(Array.isArray(d) ? d : []); setLoadingItems(false) })
      .catch(() => setLoadingItems(false))
  }, [])

  const filtered = search.trim()
    ? allItems.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        (i.group ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : allItems

  function addToCart(item: Item) {
    setCart(prev => {
      const existing = prev.findIndex(l => l.item.id === item.id)
      if (existing >= 0) {
        return prev.map((l, i) => i === existing ? { ...l, qty: l.qty + 1 } : l)
      }
      return [...prev, { item, qty: 1, price: item.selling_price }]
    })
  }

  function updateCart(idx: number, field: 'qty' | 'price', val: number) {
    setCart(prev => prev.map((l, i) => i === idx ? { ...l, [field]: val } : l))
  }

  function removeFromCart(idx: number) {
    setCart(prev => prev.filter((_, i) => i !== idx))
  }

  const total = cart.reduce((s, l) => s + l.qty * l.price, 0)
  const change = cashCounted ? Number(cashCounted) - total : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!cart.length) return
    setSaving(true)
    const res = await fetch('/api/sales/receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        customer: customer || 'Walk In Customer',
        cashCounted: cashCounted ? Number(cashCounted) : null,
        lines: cart.map(l => ({
          itemId: l.item.id,
          itemName: l.item.name,
          qty: l.qty,
          price: l.price,
          total: l.qty * l.price,
        })),
      }),
    })
    setSaving(false)
    if (res.ok) {
      const d = await res.json()
      setDone(d.receiptNumber)
      setTimeout(() => router.push('/sales'), 1500)
    }
  }

  if (done) return (
    <div className="py-20 text-center">
      <p className="text-green-600 font-bold text-xl">✓ Saved</p>
      <p className="text-gray-600 mt-1">Receipt {done}</p>
    </div>
  )

  return (
    <div className="py-3 space-y-3 max-w-2xl">
      <h1 className="text-base font-bold text-gray-900">New Sales Receipt</h1>

      {/* Header fields */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-400 font-semibold uppercase">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full mt-0.5 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-400" />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-semibold uppercase">Customer</label>
            <input value={customer} onChange={e => setCustomer(e.target.value)}
              placeholder="Walk In Customer"
              className="w-full mt-0.5 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-400 placeholder-gray-300" />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-gray-400 font-semibold uppercase">Cash Counted (₵)</label>
          <input type="number" step="0.01" inputMode="decimal" value={cashCounted}
            onChange={e => setCashCounted(e.target.value)} placeholder="0.00"
            className="w-full mt-0.5 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-400 placeholder-gray-300" />
        </div>
      </div>

      {/* Cart */}
      {cart.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Cart ({cart.length} item{cart.length !== 1 ? 's' : ''})</span>
            <span className="text-xs font-bold text-gray-900">₵{total.toFixed(2)}</span>
          </div>
          {/* Cart header row */}
          <div className="grid grid-cols-[1fr_60px_70px_28px] gap-1 px-3 py-1 border-b border-gray-100">
            <span className="text-[9px] text-gray-400 font-semibold uppercase">Item</span>
            <span className="text-[9px] text-gray-400 font-semibold uppercase text-center">Qty</span>
            <span className="text-[9px] text-gray-400 font-semibold uppercase text-center">Price ₵</span>
            <span />
          </div>
          <div className="divide-y divide-gray-100">
            {cart.map((l, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_60px_70px_28px] gap-1 items-center px-3 py-1.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">{l.item.name}</p>
                  <p className="text-[9px] text-gray-400">={`₵${(l.qty * l.price).toFixed(2)}`}</p>
                </div>
                <input type="number" min="0.01" step="any" inputMode="decimal"
                  value={l.qty}
                  onChange={e => updateCart(idx, 'qty', Number(e.target.value))}
                  className="w-full text-center text-xs text-gray-900 bg-gray-50 border border-gray-200 rounded px-1 py-1 outline-none focus:ring-1 focus:ring-blue-400" />
                <input type="number" min="0" step="0.01" inputMode="decimal"
                  value={l.price}
                  onChange={e => updateCart(idx, 'price', Number(e.target.value))}
                  className="w-full text-center text-xs text-gray-900 bg-gray-50 border border-gray-200 rounded px-1 py-1 outline-none focus:ring-1 focus:ring-blue-400" />
                <button type="button" onClick={() => removeFromCart(idx)}
                  className="text-gray-300 hover:text-red-400 text-lg font-bold leading-none text-center transition">
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 px-3 py-2 space-y-1">
            <div className="flex justify-between text-sm font-bold text-gray-900">
              <span>Total</span>
              <span>₵{total.toFixed(2)}</span>
            </div>
            {change !== null && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Change</span>
                <span className={`font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  ₵{change.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="px-3 pb-3">
            <button type="submit" disabled={!cart.length || saving}
              className="w-full bg-green-600 hover:bg-green-500 active:bg-green-700 disabled:opacity-40 text-white font-semibold rounded-xl py-3 text-sm transition">
              {saving ? 'Saving…' : 'Save Receipt'}
            </button>
          </form>
        </div>
      )}

      {/* Item picker */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-100">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={loadingItems ? 'Loading items…' : `Search ${allItems.length} items…`}
            disabled={loadingItems}
            className="w-full text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
          />
        </div>

        {loadingItems ? (
          <p className="py-8 text-center text-gray-400 text-sm">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-gray-400 text-sm">No items match "{search}"</p>
        ) : (
          <div className="max-h-[55vh] overflow-y-auto divide-y divide-gray-100">
            {filtered.map(item => {
              const inCart = cart.find(l => l.item.id === item.id)
              return (
                <button key={item.id} type="button"
                  onPointerDown={e => { e.preventDefault(); addToCart(item) }}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 active:bg-blue-100 transition flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-900 leading-tight truncate">{item.name}</p>
                    <p className="text-[9px] text-gray-400 leading-tight">{item.group ?? ''}{item.group ? ' · ' : ''}SOH: {item.soh}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-700">₵{item.selling_price.toFixed(2)}</span>
                    {inCart ? (
                      <span className="text-[9px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">×{inCart.qty}</span>
                    ) : (
                      <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">+</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
