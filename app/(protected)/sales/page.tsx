'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { fmtDate } from '@/lib/fmtDate'

type Receipt = {
  id: number
  receipt_number: string
  receipt_date: string
  customer_name: string | null
  invoice_amount: string | null
  cash_counted: string | null
  wnw: string | null
}

type Line = {
  item_name: string
  quantity: string | null
  item_price: string | null
  item_total: string | null
  usage_unit: string | null
}


function fmtAmt(val: string | null) {
  if (val === null || val === undefined) return '—'
  const n = parseFloat(val)
  if (isNaN(n)) return '—'
  return `GH₵ ${n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function wnwColor(wnw: string | null) {
  if (!wnw) return 'text-gray-400'
  const n = parseFloat(wnw)
  if (n > 0) return 'text-orange-600 font-semibold'
  if (n < 0) return 'text-red-600 font-semibold'
  return 'text-green-600 font-semibold'
}

export default function SalesPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Receipt | null>(null)
  const [lines, setLines] = useState<Line[]>([])
  const [linesLoading, setLinesLoading] = useState(false)
  const [search, setSearch] = useState('')

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ receipt_date: '', customer_name: '', invoice_amount: '', cash_counted: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/sales')
      .then(r => r.json())
      .then(data => { setReceipts(data); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return receipts
    return receipts.filter(r =>
      (r.customer_name ?? '').toLowerCase().includes(q) ||
      r.receipt_number.toLowerCase().includes(q) ||
      r.receipt_date.includes(q)
    )
  }, [receipts, search])

  async function selectReceipt(r: Receipt) {
    setSelected(r)
    setEditing(false)
    setLines([])
    setLinesLoading(true)
    const res = await fetch(`/api/sales/${r.id}`)
    setLines(await res.json())
    setLinesLoading(false)
  }

  function startEdit(r: Receipt) {
    setEditForm({
      receipt_date: r.receipt_date?.slice(0, 10) ?? '',
      customer_name: r.customer_name ?? '',
      invoice_amount: r.invoice_amount ? parseFloat(r.invoice_amount).toString() : '',
      cash_counted: r.cash_counted ? parseFloat(r.cash_counted).toString() : '',
    })
    setEditing(true)
  }

  async function saveEdit() {
    if (!selected) return
    setSaving(true)
    const res = await fetch(`/api/sales/${selected.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receipt_date: editForm.receipt_date || undefined,
        customer_name: editForm.customer_name || null,
        invoice_amount: editForm.invoice_amount ? parseFloat(editForm.invoice_amount) : undefined,
        cash_counted: editForm.cash_counted ? parseFloat(editForm.cash_counted) : null,
      }),
    })
    setSaving(false)
    if (res.ok) {
      const updated = await res.json()
      const merged: Receipt = { ...selected, ...updated }
      setSelected(merged)
      setReceipts(prev => prev.map(r => r.id === selected.id ? merged : r))
      setEditing(false)
    }
  }

  if (loading) return <div className="py-20 text-center text-gray-400">Loading...</div>

  const inputCls = 'w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2.5 text-base text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-400'
  const labelCls = 'text-xs text-gray-400 font-medium mb-1 block'

  return (
    <div className="py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Sales Receipts</h1>
          <p className="text-sm text-gray-400 mt-0.5">{filtered.length} of {receipts.length} receipts</p>
        </div>
        <Link href="/sales/new"
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
          + New
        </Link>
      </div>

      {/* Search */}
      <input
        type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by customer, receipt no, or date..."
        className="w-full mb-4 bg-white border border-gray-200 rounded-xl px-4 py-3 text-base
          text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-400"
      />

      <div className="md:flex md:gap-4 md:h-[calc(100vh-200px)]">

        {/* Left: receipts list */}
        <div className={`md:w-2/5 md:overflow-y-auto space-y-2 ${selected ? 'hidden md:block' : 'block'}`}>
          {filtered.map(r => (
            <button key={r.id} onClick={() => selectReceipt(r)}
              className={`w-full text-left rounded-xl border p-3 transition
                ${selected?.id === r.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {r.customer_name ?? 'Walk-in Customer'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmtDate(r.receipt_date)}</p>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="text-sm font-bold text-gray-900">{fmtAmt(r.invoice_amount)}</p>
                  {r.cash_counted && (
                    <p className="text-xs text-gray-400">Cash: {fmtAmt(r.cash_counted)}</p>
                  )}
                  {r.wnw !== null && (
                    <p className={`text-xs ${wnwColor(r.wnw)}`}>
                      WNW: {fmtAmt(r.wnw)}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Right: detail */}
        {selected && (
          <div className="md:flex-1 md:overflow-y-auto">
            {/* Mobile back */}
            <button onClick={() => setSelected(null)}
              className="md:hidden flex items-center gap-1 text-blue-600 text-sm font-medium mb-3">
              &larr; Back
            </button>

            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
              {editing ? (
                /* Edit form */
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-900">Edit Receipt</p>
                  <div>
                    <label className={labelCls}>Date</label>
                    <input type="date" value={editForm.receipt_date}
                      onChange={e => setEditForm(f => ({ ...f, receipt_date: e.target.value }))}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Customer Name</label>
                    <input value={editForm.customer_name}
                      onChange={e => setEditForm(f => ({ ...f, customer_name: e.target.value }))}
                      placeholder="Walk-in Customer" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Invoice Amount (GH₵)</label>
                      <input type="number" min="0" step="0.01" inputMode="decimal"
                        value={editForm.invoice_amount}
                        onChange={e => setEditForm(f => ({ ...f, invoice_amount: e.target.value }))}
                        placeholder="0.00" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Cash Counted (GH₵)</label>
                      <input type="number" min="0" step="0.01" inputMode="decimal"
                        value={editForm.cash_counted}
                        onChange={e => setEditForm(f => ({ ...f, cash_counted: e.target.value }))}
                        placeholder="0.00" className={inputCls} />
                    </div>
                  </div>
                  {/* Live WNW preview */}
                  {editForm.cash_counted && editForm.invoice_amount && (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">WNW (auto-calculated)</p>
                      <p className={`font-semibold ${wnwColor(
                        String(parseFloat(editForm.cash_counted) - parseFloat(editForm.invoice_amount))
                      )}`}>
                        {fmtAmt(String(parseFloat(editForm.cash_counted) - parseFloat(editForm.invoice_amount)))}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={saveEdit} disabled={saving}
                      className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl py-3 transition">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => setEditing(false)}
                      className="px-4 py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* View header */
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-bold text-gray-900">
                        {selected.customer_name ?? 'Walk-in Customer'}
                      </p>
                      <p className="text-sm text-gray-400">
                        {fmtDate(selected.receipt_date)} &middot; {selected.receipt_number}
                      </p>
                    </div>
                    <button onClick={() => startEdit(selected)}
                      className="shrink-0 text-xs text-blue-600 font-semibold px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition">
                      Edit
                    </button>
                  </div>

                  {/* Summary row */}
                  <div className="grid grid-cols-3 gap-3 bg-slate-50 rounded-xl p-3">
                    <div>
                      <p className="text-xs text-gray-400">Invoice</p>
                      <p className="text-sm font-bold text-gray-900">{fmtAmt(selected.invoice_amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Cash Counted</p>
                      <p className="text-sm font-bold text-gray-900">{fmtAmt(selected.cash_counted)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">WNW</p>
                      <p className={`text-sm ${wnwColor(selected.wnw)}`}>{fmtAmt(selected.wnw)}</p>
                    </div>
                  </div>
                </>
              )}

              {!editing && (
                <>
                  <div className="border-t border-gray-100" />

                  {/* Line items */}
                  {linesLoading ? (
                    <p className="text-center text-gray-400 py-6">Loading...</p>
                  ) : lines.length === 0 ? (
                    <p className="text-center text-gray-400 py-6">No line items.</p>
                  ) : (
                    <>
                      {/* Mobile: cards */}
                      <div className="md:hidden space-y-2">
                        {lines.map((line, i) => (
                          <div key={i} className="bg-slate-50 rounded-xl p-3">
                            <p className="text-sm font-semibold text-gray-900">{line.item_name}</p>
                            <div className="grid grid-cols-3 gap-2 text-xs mt-1.5">
                              <div>
                                <p className="text-gray-400">Qty</p>
                                <p className="text-gray-900 font-medium">
                                  {line.quantity ? parseFloat(line.quantity) : '—'}
                                  {line.usage_unit ? ` ${line.usage_unit}` : ''}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-400">Price</p>
                                <p className="text-gray-900 font-medium">{fmtAmt(line.item_price)}</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Total</p>
                                <p className="text-gray-900 font-semibold">{fmtAmt(line.item_total)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Desktop: table */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                              <th className="pb-2 font-medium">Item</th>
                              <th className="pb-2 font-medium text-right">Qty</th>
                              <th className="pb-2 font-medium text-right">Price</th>
                              <th className="pb-2 font-medium text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {lines.map((line, i) => (
                              <tr key={i}>
                                <td className="py-2 text-gray-900">{line.item_name}</td>
                                <td className="py-2 text-right text-gray-600">
                                  {line.quantity ? parseFloat(line.quantity) : '—'}
                                  {line.usage_unit ? ` ${line.usage_unit}` : ''}
                                </td>
                                <td className="py-2 text-right text-gray-600">{fmtAmt(line.item_price)}</td>
                                <td className="py-2 text-right font-semibold text-gray-900">{fmtAmt(line.item_total)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-gray-200">
                              <td colSpan={3} className="pt-3 text-sm font-semibold text-gray-600 text-right">Total</td>
                              <td className="pt-3 text-right font-bold text-gray-900">{fmtAmt(selected.invoice_amount)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
