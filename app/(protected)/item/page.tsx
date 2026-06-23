'use client'
import { useState, useEffect, useRef, useMemo } from 'react'

// ── Shared types ─────────────────────────────────────────────────────────────

type Item = {
  id: number
  item_name: string
  cf_group: string | null
  selling_rate: string | null
  purchase_rate: string | null
  units_per_pack: string | null
  unit_name: string | null
  calculated_soh: number
}

type DayRow = {
  date: string
  qty_counted: string | null
  wic_qty: string | null
  gmc_qty: string | null
  bills_qty: string | null
}

type ComputedRow = DayRow & { expected_soh: number | null; loss: number | null }

// ── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  item_name: '', cf_group: '', selling_rate: '', purchase_rate: '', units_per_pack: '', unit_name: '',
}

function fmt(val: string | null) {
  if (!val) return '—'
  const n = parseFloat(val)
  return isNaN(n) ? val : n % 1 === 0 ? n.toString() : n.toFixed(2)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GH', { day: '2-digit', month: 'short', year: 'numeric' })
}

function numVal(val: string | null): number {
  return val ? parseFloat(val) || 0 : 0
}

function computeRows(rows: DayRow[]): ComputedRow[] {
  const result: ComputedRow[] = []
  let prev: number | null = null
  for (const row of rows) {
    const bills = numVal(row.bills_qty)
    const wic   = numVal(row.wic_qty)
    const gmc   = numVal(row.gmc_qty)
    const counted = row.qty_counted !== null ? parseFloat(row.qty_counted) : null
    let expected: number | null = null
    let loss: number | null = null
    if (prev === null) {
      if (counted !== null) { prev = counted; expected = counted }
    } else {
      expected = parseFloat((prev + bills - wic - gmc).toFixed(4))
      if (counted !== null) { loss = parseFloat((expected - counted).toFixed(4)); prev = counted }
      else { prev = expected }
    }
    result.push({ ...row, expected_soh: expected, loss })
  }
  return result
}

function fmtQ(val: string | null) {
  if (!val) return <span className="text-gray-300">—</span>
  const n = parseFloat(val)
  return <>{n % 1 === 0 ? n : n.toFixed(2)}</>
}

function fmtN(val: number | null) {
  if (val === null) return <span className="text-gray-300">—</span>
  return <>{val % 1 === 0 ? val : val.toFixed(2)}</>
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [tab, setTab] = useState<'items' | 'losses'>('items')
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/items')
      .then(r => r.json())
      .then(data => { setItems(data); setLoading(false) })
  }, [])

  if (loading) return <div className="py-20 text-center text-gray-400">Loading...</div>

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Inventory</h1>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button onClick={() => setTab('items')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition
              ${tab === 'items' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            Items
          </button>
          <button onClick={() => setTab('losses')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition
              ${tab === 'losses' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            Losses
          </button>
        </div>
      </div>

      {tab === 'items'
        ? <ItemsTab items={items} setItems={setItems} />
        : <LossesTab items={items} />}
    </div>
  )
}

// ── Items tab ─────────────────────────────────────────────────────────────────

function ItemsTab({ items, setItems }: { items: Item[]; setItems: React.Dispatch<React.SetStateAction<Item[]>> }) {
  const [group, setGroup] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_FORM)
  const [adding, setAdding] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const groups = ['All', ...Array.from(new Set(items.map(i => i.cf_group ?? 'Ungrouped'))).sort()]

  const filtered = items.filter(i => {
    const matchGroup = !group || group === 'All' ? true : (i.cf_group ?? 'Ungrouped') === group
    return matchGroup && i.item_name.toLowerCase().includes(search.toLowerCase())
  })

  function startEdit(item: Item) {
    setEditId(item.id)
    setEditForm({
      item_name: item.item_name,
      cf_group: item.cf_group ?? '',
      selling_rate: item.selling_rate ? parseFloat(item.selling_rate).toString() : '',
      purchase_rate: item.purchase_rate ? parseFloat(item.purchase_rate).toString() : '',
      units_per_pack: item.units_per_pack ? parseFloat(item.units_per_pack).toString() : '',
      unit_name: item.unit_name ?? '',
    })
  }

  async function saveEdit() {
    if (!editId) return
    setSaving(true)
    const res = await fetch(`/api/items/${editId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_name: editForm.item_name || undefined,
        cf_group: editForm.cf_group || null,
        selling_rate: editForm.selling_rate ? parseFloat(editForm.selling_rate) : null,
        purchase_rate: editForm.purchase_rate ? parseFloat(editForm.purchase_rate) : null,
        units_per_pack: editForm.units_per_pack ? parseFloat(editForm.units_per_pack) : null,
        unit_name: editForm.unit_name || null,
      }),
    })
    setSaving(false)
    if (res.ok) {
      const updated = await res.json()
      setItems(prev => prev.map(i => i.id === editId ? { ...i, ...updated, calculated_soh: i.calculated_soh } : i))
      setEditId(null)
    }
  }

  async function saveAdd() {
    if (!addForm.item_name.trim()) return
    setAdding(true)
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_name: addForm.item_name.trim(),
        cf_group: addForm.cf_group || null,
        selling_rate: addForm.selling_rate ? parseFloat(addForm.selling_rate) : null,
        purchase_rate: addForm.purchase_rate ? parseFloat(addForm.purchase_rate) : null,
        units_per_pack: addForm.units_per_pack ? parseFloat(addForm.units_per_pack) : null,
        unit_name: addForm.unit_name || null,
      }),
    })
    setAdding(false)
    if (res.ok) {
      const newItem = await res.json()
      setItems(prev => [...prev, { ...newItem, calculated_soh: 0 }])
      setAddForm(EMPTY_FORM)
      setShowAdd(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{filtered.length} of {items.length} items</p>
        <button onClick={() => { setShowAdd(true); setEditId(null) }}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
          + Add Item
        </button>
      </div>

      <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search items..."
        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base
          text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-400" />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {groups.map(g => (
          <button key={g} onClick={() => setGroup(g === 'All' ? null : g)}
            className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition
              ${(g === 'All' && !group) || g === group ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-700'}`}>
            {g}
          </button>
        ))}
      </div>

      {showAdd && (
        <div className="bg-white border border-blue-300 rounded-xl p-4 space-y-3">
          <p className="text-gray-900 font-semibold">New Item</p>
          <ItemForm form={addForm} onChange={setAddForm} groups={groups.filter(g => g !== 'All')} />
          <div className="flex gap-2">
            <button onClick={saveAdd} disabled={adding || !addForm.item_name.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl py-3 transition">
              {adding ? 'Saving...' : 'Save Item'}
            </button>
            <button onClick={() => setShowAdd(false)}
              className="px-4 py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-center text-gray-400 py-10">No items found.</p>}
        {filtered.map(item => (
          <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4">
            {editId === item.id ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 font-medium">Editing item</p>
                <ItemForm form={editForm} onChange={setEditForm} groups={groups.filter(g => g !== 'All')} />
                <div className="flex gap-2">
                  <button onClick={saveEdit} disabled={saving}
                    className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl py-3 transition">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => setEditId(null)}
                    className="px-4 py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-gray-900 font-medium leading-snug">{item.item_name}</p>
                    {item.cf_group && <p className="text-gray-400 text-xs mt-0.5">{item.cf_group}</p>}
                  </div>
                  <button onClick={() => startEdit(item)}
                    className="shrink-0 text-xs text-blue-600 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100">Edit</button>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-1">
                  <Stat label="SOH" value={Number(item.calculated_soh) % 1 === 0 ? Number(item.calculated_soh).toString() : Number(item.calculated_soh).toFixed(2)} />
                  <Stat label="Selling Price" value={item.selling_rate ? `GH₵ ${fmt(item.selling_rate)}` : '—'} />
                  <Stat label="Cost Price" value={item.purchase_rate ? `GH₵ ${fmt(item.purchase_rate)}` : '—'} />
                  <Stat label="Unit" value={item.unit_name ?? '—'} />
                  {item.units_per_pack && <Stat label="Units/Pack" value={fmt(item.units_per_pack)} />}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Losses tab ────────────────────────────────────────────────────────────────

function LossesTab({ items }: { items: Item[] }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Item | null>(null)
  const [rows, setRows] = useState<ComputedRow[]>([])
  const [rowsLoading, setRowsLoading] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return items
    return items.filter(i =>
      i.item_name.toLowerCase().includes(q) ||
      (i.cf_group ?? '').toLowerCase().includes(q)
    )
  }, [items, search])

  async function selectItem(item: Item) {
    setSelected(item)
    setRows([])
    setRowsLoading(true)
    const res = await fetch(`/api/losses/${item.id}`)
    const data: DayRow[] = await res.json()
    setRows(computeRows(data))
    setRowsLoading(false)
  }

  const totalLoss = useMemo(() =>
    parseFloat(rows.reduce((sum, r) => sum + (r.loss ?? 0), 0).toFixed(4)), [rows])

  return (
    <div>
      <input type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search item or group..."
        className="w-full mb-3 bg-white border border-gray-200 rounded-xl px-4 py-3 text-base
          text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-400" />

      <div className="md:flex md:gap-4 md:h-[calc(100vh-220px)]">
        {/* Left: item list */}
        <div className={`md:w-2/5 md:overflow-y-auto space-y-1.5 ${selected ? 'hidden md:block' : 'block'}`}>
          <p className="text-xs text-gray-400 mb-2">{filtered.length} items — tap to view loss history</p>
          {filtered.map(item => (
            <button key={item.id} onClick={() => selectItem(item)}
              className={`w-full text-left rounded-xl border px-3 py-2.5 transition
                ${selected?.id === item.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.item_name}</p>
                  {item.cf_group && <p className="text-xs text-gray-400 mt-0.5">{item.cf_group}</p>}
                </div>
                <p className="text-xs text-gray-500 shrink-0">
                  SOH: {Number(item.calculated_soh) % 1 === 0 ? Number(item.calculated_soh) : Number(item.calculated_soh).toFixed(2)}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Right: detail */}
        {selected && (
          <div className="md:flex-1 md:overflow-y-auto">
            <button onClick={() => setSelected(null)}
              className="md:hidden flex items-center gap-1 text-blue-600 text-sm font-medium mb-3">
              &larr; Back
            </button>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2 mb-4">
                <div>
                  <p className="text-base font-bold text-gray-900">{selected.item_name}</p>
                  {selected.cf_group && <p className="text-xs text-gray-400">{selected.cf_group}</p>}
                </div>
                {rows.length > 0 && (
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">Cumulative Loss</p>
                    <p className={`text-lg font-bold ${totalLoss > 0 ? 'text-red-600' : totalLoss < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                      {totalLoss > 0 ? '+' : ''}{totalLoss % 1 === 0 ? totalLoss : totalLoss.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>

              {rowsLoading ? (
                <p className="text-center text-gray-400 py-10">Loading...</p>
              ) : rows.length === 0 ? (
                <p className="text-center text-gray-400 py-10">No activity found for this item.</p>
              ) : (
                <div className="overflow-x-auto -mx-4 px-4">
                  <table className="w-full text-xs min-w-[580px]">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-100">
                        <th className="pb-2 font-medium pr-3">Date</th>
                        <th className="pb-2 font-medium text-right pr-3">Count</th>
                        <th className="pb-2 font-medium text-right pr-3">WIC Sales</th>
                        <th className="pb-2 font-medium text-right pr-3">GMC Sales</th>
                        <th className="pb-2 font-medium text-right pr-3">Bills In</th>
                        <th className="pb-2 font-medium text-right pr-3">Expected</th>
                        <th className="pb-2 font-medium text-right">Loss / Gain</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {rows.map((row, i) => (
                        <tr key={i} className={row.loss !== null && row.loss > 0.001 ? 'bg-red-50' : ''}>
                          <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">{fmtDate(row.date)}</td>
                          <td className="py-2 pr-3 text-right font-semibold text-gray-900">{fmtQ(row.qty_counted)}</td>
                          <td className="py-2 pr-3 text-right text-gray-600">{fmtQ(row.wic_qty)}</td>
                          <td className="py-2 pr-3 text-right text-gray-600">{fmtQ(row.gmc_qty)}</td>
                          <td className="py-2 pr-3 text-right text-blue-600">{fmtQ(row.bills_qty)}</td>
                          <td className="py-2 pr-3 text-right text-gray-400">{fmtN(row.expected_soh)}</td>
                          <td className="py-2 text-right font-semibold">
                            {row.loss === null ? <span className="text-gray-300">—</span>
                              : row.loss > 0.001 ? <span className="text-red-600">+{row.loss % 1 === 0 ? row.loss : row.loss.toFixed(2)}</span>
                              : row.loss < -0.001 ? <span className="text-green-600">{row.loss % 1 === 0 ? row.loss : row.loss.toFixed(2)}</span>
                              : <span className="text-gray-400">0</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200">
                        <td colSpan={6} className="pt-3 text-right text-xs font-semibold text-gray-500 pr-3">Total Loss / Gain</td>
                        <td className={`pt-3 text-right text-sm font-bold ${totalLoss > 0 ? 'text-red-600' : totalLoss < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {totalLoss > 0 ? '+' : ''}{totalLoss % 1 === 0 ? totalLoss : totalLoss.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-400 text-xs">{label}</p>
      <p className="text-gray-900 font-medium">{value}</p>
    </div>
  )
}

function ItemForm({ form, onChange, groups }: { form: typeof EMPTY_FORM; onChange: (f: typeof EMPTY_FORM) => void; groups: string[] }) {
  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...form, [k]: e.target.value })
  const inputCls = 'w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2.5 text-base text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-400'
  const labelCls = 'text-xs text-gray-500 font-medium mb-1 block'
  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>Item Name *</label>
        <input value={form.item_name} onChange={set('item_name')} placeholder="Item name" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Group</label>
        <select value={form.cf_group} onChange={set('cf_group')} className={inputCls}>
          <option value="">— No group —</option>
          {groups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Selling Price (GH&#8373;)</label>
          <input type="number" min="0" step="0.01" inputMode="decimal"
            value={form.selling_rate} onChange={set('selling_rate')} placeholder="0.00" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Cost Price (GH&#8373;)</label>
          <input type="number" min="0" step="0.01" inputMode="decimal"
            value={form.purchase_rate} onChange={set('purchase_rate')} placeholder="0.00" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Units / Pack</label>
          <input type="number" min="0" step="1" inputMode="decimal"
            value={form.units_per_pack} onChange={set('units_per_pack')} placeholder="e.g. 50" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Unit Name</label>
          <input value={form.unit_name} onChange={set('unit_name')} placeholder="e.g. Pieces" className={inputCls} />
        </div>
      </div>
    </div>
  )
}
