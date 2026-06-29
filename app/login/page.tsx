'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { distanceMeters, SHOP_LAT, SHOP_LNG, ALLOWED_RADIUS_METERS } from '@/lib/geo'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const router = useRouter()

  function getLocation(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Your browser does not support location services.'))
        return
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true, timeout: 15000, maximumAge: 0,
      })
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setStatusMsg('Checking your location…')

    let lat: number, lng: number
    try {
      const pos = await getLocation()
      lat = pos.coords.latitude
      lng = pos.coords.longitude
    } catch (err: any) {
      setLoading(false)
      setStatusMsg('')
      if (err?.code === 1) setError('Location access was denied. Please enable location services for this site and try again.')
      else if (err?.code === 2 || err?.code === 3) setError('Could not get your location. Make sure location/GPS is turned on and try again.')
      else setError(err?.message || 'Location is required to sign in.')
      return
    }

    const distance = distanceMeters(lat, lng, SHOP_LAT, SHOP_LNG)
    if (distance > ALLOWED_RADIUS_METERS) {
      setLoading(false)
      setStatusMsg('')
      setError(`You're too far from the shop to sign in (about ${Math.round(distance)}m away). Please try again from the shop.`)
      return
    }

    setStatusMsg('Signing in…')
    const res = await signIn('credentials', { username, password, latitude: lat, longitude: lng, redirect: false })
    setLoading(false)
    setStatusMsg('')
    if (res?.error) setError('Wrong username/email or password')
    else router.push('/')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Grony</h1>
          <p className="text-gray-600 mt-1 text-sm">Multimedia &middot; Assin Fosu</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 space-y-4 shadow-xl">
          <div>
            <label className="text-sm text-gray-600 block mb-1">Username or Email</label>
            <input
              className="w-full bg-gray-100 text-gray-900 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400"
              value={username} onChange={e => setUsername(e.target.value)}
              autoComplete="username" autoFocus
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Password</label>
            <input
              type="password"
              className="w-full bg-gray-100 text-gray-900 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400"
              value={password} onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {statusMsg && <p className="text-blue-600 text-sm">{statusMsg}</p>}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg py-3 text-sm transition">
            {loading ? (statusMsg || 'Signing in...') : 'Sign in'}
          </button>
          <p className="text-center text-[11px] text-gray-400">
            📍 Location must be enabled and you must be at the shop to sign in.
          </p>
          <p className="text-center text-sm text-gray-400">
            <Link href="/forgot-password" className="text-blue-600 hover:underline">Forgot password?</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
