'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

type Mine = { actual_in: string | null; actual_out: string | null }
type StaffRow = { staff_name: string; actual_in: string | null; actual_out: string | null }
type RecentRow = { staff_name: string; work_date: string; actual_in: string | null; actual_out: string | null }

const STAFF = ['joe', 'bino', 'james', 'rawlings']

function fmt12Now() {
  const d = new Date()
  let h = d.getHours(), m = d.getMinutes()
  const ampm = h >= 12 ? 'pm' : 'am'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')}${ampm}`
}

function TimePicker({ onConfirm, onCancel }: { onConfirm: (t: string) => void; onCancel: () => void }) {
  const now = new Date()
  const [hour, setHour] = useState(String(now.getHours() % 12 || 12))
  const [minute, setMinute] = useState(String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0'))
  const [ampm, setAmpm] = useState(now.getHours() >= 12 ? 'pm' : 'am')

  const selCls = 'bg-gray-100 border border-gray-200 rounded-xl px-3 py-2.5 text-base text-gray-900 outline-none focus:ring-2 focus:ring-blue-400'

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Select time:</p>
      <div className="flex items-center gap-2">
        <select value={hour} onChange={e => setHour(e.target.value)} className={selCls}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <span className="text-gray-400 font-bold">:</span>
        <select value={minute} onChange={e => setMinute(e.target.value)} className={selCls}>
          {Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')).map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select value={ampm} onChange={e => setAmpm(e.target.value)} className={selCls}>
          <option value="am">AM</option>
          <option value="pm">PM</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onConfirm(`${hour}:${minute}${ampm}`)}
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl py-3 text-sm transition">
          Confirm
        </button>
        <button onClick={onCancel}
          className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold">
          Cancel
        </button>
      </div>
    </div>
  )
}

function ActionCard({
  action, mine, saving, onCurrentTime, onPick,
}: {
  action: 'in' | 'out'
  mine: Mine | null
  saving: boolean
  onCurrentTime: (a: 'in' | 'out') => void
  onPick: (a: 'in' | 'out') => void
}) {
  const recorded = action === 'in' ? mine?.actual_in : mine?.actual_out
  const blocked = action === 'out' && !mine?.actual_in
  const label = action === 'in' ? 'Time In' : 'Time Out'
  const color = action === 'in' ? 'bg-green-600 hover:bg-green-500' : 'bg-orange-500 hover:bg-orange-400'

  return (
    <div className={`bg-white border rounded-xl p-4 space-y-3 ${blocked ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between">
        <p className="font-semibold text-gray-900">{label}</p>
        {recorded && <span className="text-sm font-bold text-gray-700">{recorded}</span>}
      </div>
      {recorded ? (
        <p className="text-xs text-gray-400">Already recorded. Tap to update.</p>
      ) : blocked ? (
        <p className="text-xs text-red-400">Record Time In first.</p>
      ) : null}
      {!blocked && (
        <div className="flex gap-2">
          <button onClick={() => onCurrentTime(action)} disabled={saving}
            className={`flex-1 ${color} disabled:opacity-40 text-white font-semibold rounded-xl py-3 text-sm transition`}>
            {saving ? 'Saving...' : 'Current Time'}
          </button>
          <button onClick={() => onPick(action)} disabled={saving}
            className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition">
            Pick Time
          </button>
        </div>
      )}
    </div>
  )
}

function groupRecent(recent: RecentRow[]) {
  const map = new Map<string, Record<string, { in: string | null; out: string | null }>>()
  for (const r of recent) {
    if (!map.has(r.work_date)) map.set(r.work_date, {})
    map.get(r.work_date)![r.staff_name] = { in: r.actual_in, out: r.actual_out }
  }
  return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
}

function StaffTimesContent() {
  const params = useSearchParams()
  const initAction = (params.get('action') as 'in' | 'out') ?? null

  const [mine, setMine] = useState<Mine | null>(null)
  const [today, setToday] = useState<StaffRow[]>([])
  const [recent, setRecent] = useState<RecentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [picking, setPicking] = useState<'in' | 'out' | null>(initAction)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/staff-times/today').then(r => r.json()).then(d => {
      setMine(d.mine)
      setToday(d.today)
      setRecent(d.recent)
      setLoading(false)
    })
  }, [])

  async function record(action: 'in' | 'out', time: string) {
    setSaving(true)
    setError('')
    const res = await fetch('/api/staff-times/today', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, time }),
    })
    setSaving(false)
    setPicking(null)
    if (res.ok) {
      const updated = await res.json()
      setMine(updated)
      setToday(prev => {
        // refresh today list
        fetch('/api/staff-times/today').then(r => r.json()).then(d => {
          setToday(d.today)
          setRecent(d.recent)
        })
        return prev
      })
    } else {
      const d = await res.json()
      setError(d.error ?? 'Failed to save')
    }
  }

  const todayStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const grouped = groupRecent(recent)

  if (loading) return <div className="py-20 text-center text-gray-400">Loading...</div>

  return (
    <div className="py-4 space-y-5">
      <div>
        <h1 className="text-xl font-bold">Attendance</h1>
        <p className="text-xs text-gray-400 mt-0.5">{todayStr}</p>
      </div>

      {error && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-3">{error}</p>}

      {/* Time In / Time Out cards */}
      {picking ? (
        <div className="bg-white border border-blue-300 rounded-xl p-4 space-y-3">
          <p className="font-semibold text-gray-900">Recording Time {picking === 'in' ? 'In' : 'Out'}</p>
          <TimePicker
            onConfirm={t => record(picking, t)}
            onCancel={() => setPicking(null)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <ActionCard action="in" mine={mine} saving={saving}
            onCurrentTime={a => record(a, fmt12Now())}
            onPick={a => setPicking(a)} />
          <ActionCard action="out" mine={mine} saving={saving}
            onCurrentTime={a => record(a, fmt12Now())}
            onPick={a => setPicking(a)} />
        </div>
      )}

      {/* Today's timetable */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Today — All Staff</p>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-3 py-2 text-xs text-gray-500 font-semibold">Staff</th>
                <th className="text-center px-3 py-2 text-xs text-gray-500 font-semibold">Time In</th>
                <th className="text-center px-3 py-2 text-xs text-gray-500 font-semibold">Time Out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {STAFF.map(name => {
                const row = today.find(r => r.staff_name === name)
                return (
                  <tr key={name}>
                    <td className="px-3 py-2.5 font-medium capitalize text-gray-900">{name}</td>
                    <td className="px-3 py-2.5 text-center text-green-700">{row?.actual_in ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2.5 text-center text-orange-600">{row?.actual_out ?? <span className="text-gray-300">—</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent 14 days timetable */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Last 14 Days</p>
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-xs min-w-[520px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-3 py-2 text-gray-500 font-semibold">Date</th>
                {STAFF.map(s => (
                  <th key={s} colSpan={2} className="text-center px-2 py-2 text-gray-500 font-semibold capitalize">{s}</th>
                ))}
              </tr>
              <tr className="border-b border-gray-100">
                <th className="px-3 py-1 text-gray-400"></th>
                {STAFF.map(s => (
                  <>
                    <th key={s+'in'} className="text-center px-1 py-1 text-green-600 font-medium">In</th>
                    <th key={s+'out'} className="text-center px-1 py-1 text-orange-500 font-medium">Out</th>
                  </>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {grouped.map(([date, staffMap]) => (
                <tr key={date} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', weekday: 'short' })}
                  </td>
                  {STAFF.map(s => (
                    <>
                      <td key={s+'in'} className="text-center px-1 py-2 text-green-700">{staffMap[s]?.in ?? <span className="text-gray-200">—</span>}</td>
                      <td key={s+'out'} className="text-center px-1 py-2 text-orange-600">{staffMap[s]?.out ?? <span className="text-gray-200">—</span>}</td>
                    </>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function StaffTimesPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-400">Loading...</div>}>
      <StaffTimesContent />
    </Suspense>
  )
}
