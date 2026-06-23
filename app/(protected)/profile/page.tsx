'use client'
import { useState, useEffect } from 'react'

type Profile = {
  id: number
  username: string
  display_name: string
  email: string | null
  phone: string | null
  role: string
}

const inputCls = 'w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2.5 text-base text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-400'
const labelCls = 'text-xs text-gray-500 font-medium mb-1 block'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ display_name: '', email: '', phone: '', password: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(data => {
      setProfile(data)
      setForm({ display_name: data.display_name ?? '', email: data.email ?? '', phone: data.phone ?? '', password: '', confirm: '' })
      setLoading(false)
    })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (form.password && form.password !== form.confirm) { setError('Passwords do not match'); return }
    if (form.password && form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setSaving(true)
    setError('')
    setSuccess('')
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      const updated = await res.json()
      setProfile(updated)
      setForm(f => ({ ...f, password: '', confirm: '' }))
      setSuccess('Profile updated.')
    } else {
      const d = await res.json()
      setError(d.error ?? 'Could not save')
    }
  }

  if (loading) return <div className="py-20 text-center text-gray-400">Loading...</div>

  return (
    <div className="py-4 max-w-md mx-auto space-y-4">
      <h1 className="text-xl font-bold">My Profile</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-xs text-gray-400 mb-1">Username</p>
        <p className="font-semibold text-gray-800">@{profile?.username}</p>
        <p className="text-xs text-gray-400 mt-2 mb-1">Role</p>
        <p className="text-sm capitalize text-gray-700">{profile?.role}</p>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <div>
          <label className={labelCls}>Display Name</label>
          <input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
            placeholder="Your name" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Email Address</label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="you@example.com" className={inputCls} />
          <p className="text-[10px] text-gray-400 mt-1">Used for login and password reset</p>
        </div>
        <div>
          <label className={labelCls}>Phone Number</label>
          <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="e.g. 0244123456" className={inputCls} />
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 mb-3">Change Password</p>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>New Password</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Leave blank to keep current" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Confirm Password</label>
              <input type="password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                placeholder="Repeat new password" className={inputCls} />
            </div>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}

        <button type="submit" disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold rounded-xl py-3 text-sm transition">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
