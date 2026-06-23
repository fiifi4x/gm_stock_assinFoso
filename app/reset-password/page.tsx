'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ResetForm() {
  const params = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    setLoading(false)
    if (res.ok) setDone(true)
    else {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
    }
  }

  if (!token) return (
    <div className="text-center text-red-500 text-sm">Invalid reset link.</div>
  )

  return done ? (
    <div className="text-center space-y-3">
      <p className="text-2xl">&#x2705;</p>
      <p className="font-semibold text-gray-900">Password changed!</p>
      <p className="text-sm text-gray-500">You can now sign in with your new password.</p>
      <Link href="/login" className="block mt-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg py-3 text-sm text-center transition">
        Sign in
      </Link>
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Set new password</h2>
        <p className="text-sm text-gray-500">Choose a password at least 6 characters long.</p>
      </div>
      <div>
        <label className="text-sm text-gray-600 block mb-1">New password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          required autoFocus
          className="w-full bg-gray-100 text-gray-900 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
      </div>
      <div>
        <label className="text-sm text-gray-600 block mb-1">Confirm password</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
          required
          className="w-full bg-gray-100 text-gray-900 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg py-3 text-sm transition">
        {loading ? 'Saving...' : 'Set password'}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Grony</h1>
          <p className="text-gray-600 mt-1 text-sm">Multimedia &middot; Assin Fosu</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-xl">
          <Suspense fallback={<p className="text-center text-gray-400">Loading...</p>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
