'use client'
import { useState, useEffect, useMemo } from 'react'
import { fmtDate } from '@/lib/fmtDate'

// ── Types ────────────────────────────────────────────────────────────────────
type RotaEntry = {
  id: number
  staff_name: string
  rota_date: string
  sched_in: string | null
  sched_out: string | null
  is_off: boolean
  role: string | null
}

type Absence = {
  id: number
  staff_name: string
  start_date: string
  end_date: string
  reason: string | null
  absence_type: string
}

// ── Constants ────────────────────────────────────────────────────────────────
const STAFF = ['Joe', 'James', 'Rawlings', 'Bino']
const ABSENCE_TYPES = ['travel', 'leave', 'sick', 'other']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const STAFF_COLORS: Record<string, string> = {
  Joe: 'bg-blue-100 text-blue-700 border-blue-200',
  James: 'bg-green-100 text-green-700 border-green-200',
  Rawlings: 'bg-orange-100 text-orange-700 border-orange-200',
  Bino: 'bg-purple-100 text-purple-700 border-purple-200',
}

const ROLE_ICONS: Record<string, string> = {
  opener: '↑', closer: '↓', normal: '·',
}

const inputCls = 'w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-400'
const labelCls = 'text-xs text-gray-400 font-medium mb-1 block'

function hoursFromShift(entry: RotaEntry): number {
  if (entry.is_off || !entry.sched_in || !entry.sched_out) return 0
  const parse = (t: string) => {
    const m = t.match(/(\d+):(\d+)(am|pm)/i)
    if (!m) return 0
    let h = parseInt(m[1]), min = parseInt(m[2])
    if (m[3].toLowerCase() === 'pm' && h !== 12) h += 12
    if (m[3].toLowerCase() === 'am' && h === 12) h = 0
    return h + min / 60
  }
  return Math.max(0, parse(entry.sched_out) - parse(entry.sched_in))
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function RotaPage() {
  const today = new Date()
  const [tab, setTab] = useState<'schedule' | 'absences'>('schedule')
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [rota, setRota] = useState<RotaEntry[]>([])
  const [absences, setAbsences] = useState<Absence[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [editEntry, setEditEntry] = useState<RotaEntry | null>(null)

  // Absence form
  const [showAbsForm, setShowAbsForm] = useState(false)
  const [absForm, setAbsForm] = useState({ staff_name: 'Joe', start_date: '', end_date: '', reason: '', absence_type: 'travel' })
  const [savingAbs, setSavingAbs] = useState(false)

  // Load rota for selected month
  useEffect(() => {
    setLoading(true)
    fetch(`/api/rota?year=${year}&month=${month}`)
      .then(r => r.json()).then(d => { setRota(d); setLoading(false) })
  }, [year, month])

  // Load absences
  useEffect(() => {
    fetch('/api/rota/absences').then(r => r.json()).then(setAbsences)
  }, [])

  async function generate() {
    setGenerating(true)
    await fetch('/api/rota/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month, leaveStaff: [] }),
    })
    const res = await fetch(`/api/rota?year=${year}&month=${month}`)
    setRota(await res.json())
    setGenerating(false)
  }

  async function saveEdit() {
    if (!editEntry) return
    const res = await fetch('/api/rota', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editEntry),
    })
    const updated = await res.json()
    setRota(prev => prev.map(e => e.id === updated.id ? updated : e))
    setEditEntry(null)
  }

  async function saveAbsence() {
    setSavingAbs(true)
    const res = await fetch('/api/rota/absences', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(absForm),
    })
    const created = await res.json()
    setAbsences(prev => [created, ...prev])
    setShowAbsForm(false)
    setSavingAbs(false)
  }

  async function deleteAbsence(id: number) {
    await fetch('/api/rota/absences', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setAbsences(prev => prev.filter(a => a.id !== id))
  }

  // ── Computed ─────────────────────────────────────────────────────────────
  // Group rota by date
  const byDate = useMemo(() => {
    const map: Record<string, RotaEntry[]> = {}
    for (const e of rota) {
      if (!map[e.rota_date]) map[e.rota_date] = []
      map[e.rota_date].push(e)
    }
    return map
  }, [rota])

  const sortedDates = useMemo(() => Object.keys(byDate).sort(), [byDate])

  // Hours summary per staff
  const hoursSummary = useMemo(() => {
    const h: Record<string, number> = {}
    for (const e of rota) h[e.staff_name] = (h[e.staff_name] ?? 0) + hoursFromShift(e)
    return h
  }, [rota])

  const DAY_SHORT = ['Su','M','Tu','W','Th','F','Sa']

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Staff Rota</h1>
        <div className="flex gap-1">
          <button onClick={() => setTab('schedule')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${tab === 'schedule' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            Schedule
          </button>
          <button onClick={() => setTab('absences')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${tab === 'absences' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            Absences
          </button>
        </div>
      </div>

      {/* ── SCHEDULE TAB ── */}
      {tab === 'schedule' && (
        <div className="space-y-4">
          {/* Month picker + Generate */}
          <div className="flex items-center gap-2 flex-wrap">
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-400">
              {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-400">
              {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={generate} disabled={generating}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
              {generating ? 'Generating…' : rota.length ? 'Re-generate' : 'Generate'}
            </button>
          </div>

          {/* Hours summary */}
          {rota.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STAFF.map(s => {
                const h = hoursSummary[s] ?? 0
                const target = s === 'Bino' ? 100 : 210
                const pct = Math.min(100, Math.round((h / target) * 100))
                return (
                  <div key={s} className="bg-white border border-gray-200 rounded-xl p-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STAFF_COLORS[s]}`}>{s}</span>
                      <span className="text-xs text-gray-400">{target}h</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{h.toFixed(1)}h</p>
                    <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-yellow-400' : 'bg-red-400'}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {loading && <p className="py-8 text-center text-gray-400">Loading…</p>}
          {!loading && rota.length === 0 && (
            <p className="py-8 text-center text-gray-400 text-sm">No rota for {MONTHS[month-1]} {year}. Click Generate to create one.</p>
          )}

          {/* Edit modal */}
          {editEntry && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setEditEntry(null)}>
              <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3 shadow-xl" onClick={e => e.stopPropagation()}>
                <p className="font-bold text-gray-900">{editEntry.staff_name} — {fmtDate(editEntry.rota_date)}</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editEntry.is_off}
                    onChange={e => setEditEntry(prev => prev ? {...prev, is_off: e.target.checked} : prev)}
                    className="w-4 h-4 accent-blue-600" />
                  <span className="text-sm text-gray-700">Day Off</span>
                </label>
                {!editEntry.is_off && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={labelCls}>Start time</label>
                        <input value={editEntry.sched_in ?? ''} placeholder="8:00am"
                          onChange={e => setEditEntry(prev => prev ? {...prev, sched_in: e.target.value} : prev)}
                          className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>End time</label>
                        <input value={editEntry.sched_out ?? ''} placeholder="5:00pm"
                          onChange={e => setEditEntry(prev => prev ? {...prev, sched_out: e.target.value} : prev)}
                          className={inputCls} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Role</label>
                      <select value={editEntry.role ?? 'normal'}
                        onChange={e => setEditEntry(prev => prev ? {...prev, role: e.target.value} : prev)}
                        className={inputCls}>
                        <option value="opener">Opener</option>
                        <option value="closer">Closer</option>
                        <option value="normal">Normal</option>
                      </select>
                    </div>
                  </>
                )}
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="flex-1 bg-green-600 text-white text-sm font-semibold rounded-xl py-2.5">Save</button>
                  <button onClick={() => setEditEntry(null)} className="px-4 py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Schedule — grouped by date */}
          <div className="space-y-3">
            {sortedDates.map(dateStr => {
              const dow = new Date(dateStr + 'T00:00:00').getDay()
              const isSun = dow === 0
              if (isSun) return null // skip Sundays from display
              const dayEntries = byDate[dateStr] ?? []
              const allOff = dayEntries.every(e => e.is_off)
              return (
                <div key={dateStr} className={`bg-white border rounded-xl overflow-hidden ${allOff ? 'border-gray-100 opacity-60' : 'border-gray-200'}`}>
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-700">{fmtDate(dateStr)}</span>
                    {allOff && <span className="text-xs text-gray-400">— all off</span>}
                  </div>
                  <div className="divide-y divide-gray-50">
                    {STAFF.map(staff => {
                      const e = dayEntries.find(x => x.staff_name === staff)
                      if (!e) return null
                      return (
                        <button key={staff} onClick={() => setEditEntry({...e})}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left transition">
                          <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full w-16 text-center ${STAFF_COLORS[staff]}`}>{staff}</span>
                          {e.is_off ? (
                            <span className="text-xs text-gray-400">OFF</span>
                          ) : (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-900 font-medium">{e.sched_in} – {e.sched_out}</span>
                              {e.role && e.role !== 'normal' && (
                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${e.role === 'opener' ? 'bg-yellow-100 text-yellow-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                  {e.role}
                                </span>
                              )}
                              <span className="text-xs text-gray-400">{hoursFromShift(e).toFixed(1)}h</span>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── ABSENCES TAB ── */}
      {tab === 'absences' && (
        <div className="space-y-3">
          <button onClick={() => setShowAbsForm(v => !v)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
            + Record Absence
          </button>

          {showAbsForm && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-900">New Absence</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Staff</label>
                  <select value={absForm.staff_name} onChange={e => setAbsForm(f => ({...f, staff_name: e.target.value}))} className={inputCls}>
                    {STAFF.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Type</label>
                  <select value={absForm.absence_type} onChange={e => setAbsForm(f => ({...f, absence_type: e.target.value}))} className={inputCls}>
                    {ABSENCE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>From</label>
                  <input type="date" value={absForm.start_date} onChange={e => setAbsForm(f => ({...f, start_date: e.target.value}))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>To</label>
                  <input type="date" value={absForm.end_date} onChange={e => setAbsForm(f => ({...f, end_date: e.target.value}))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Reason (optional)</label>
                <input value={absForm.reason} onChange={e => setAbsForm(f => ({...f, reason: e.target.value}))} placeholder="Details…" className={inputCls} />
              </div>
              <div className="flex gap-2">
                <button onClick={saveAbsence} disabled={savingAbs || !absForm.start_date || !absForm.end_date}
                  className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl py-3 transition">
                  {savingAbs ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setShowAbsForm(false)} className="px-4 py-3 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl">Cancel</button>
              </div>
            </div>
          )}

          {/* Current absences */}
          {absences.length === 0 && !showAbsForm && (
            <p className="py-8 text-center text-gray-400 text-sm">No absences recorded.</p>
          )}
          <div className="space-y-2">
            {absences.map(a => (
              <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STAFF_COLORS[a.staff_name] ?? 'bg-gray-100 text-gray-600'}`}>{a.staff_name}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize`}>{a.absence_type}</span>
                  </div>
                  <p className="text-sm text-gray-800 mt-1 font-medium">{fmtDate(a.start_date)} → {fmtDate(a.end_date)}</p>
                  {a.reason && <p className="text-xs text-gray-400 mt-0.5">{a.reason}</p>}
                </div>
                <button onClick={() => deleteAbsence(a.id)}
                  className="shrink-0 text-xs text-red-500 font-semibold px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 transition">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
