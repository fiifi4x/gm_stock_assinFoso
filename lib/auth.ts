import NextAuth, { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import sql from './db'
import { logActivity } from './logger'
import { distanceMeters, SHOP_LAT, SHOP_LNG, ALLOWED_RADIUS_METERS } from './geo'

class LocationError extends CredentialsSignin {
  code = 'LocationRequired'
}
class TooFarError extends CredentialsSignin {
  code = 'TooFar'
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username or Email' },
        password: { label: 'Password', type: 'password' },
        latitude: { label: 'Latitude' },
        longitude: { label: 'Longitude' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null
        const login = credentials.username as string
        const rows = await sql`
          SELECT id, username, display_name, role, password_hash
          FROM app_users
          WHERE username = ${login} OR email = ${login}
        `
        if (!rows.length) return null
        const user = rows[0]
        const valid = await bcrypt.compare(credentials.password as string, user.password_hash)
        if (!valid) return null

        const lat = parseFloat(credentials.latitude as string)
        const lng = parseFloat(credentials.longitude as string)
        const hasLocation = !isNaN(lat) && !isNaN(lng)
        const distance = hasLocation ? distanceMeters(lat, lng, SHOP_LAT, SHOP_LNG) : null
        const accepted = hasLocation && distance !== null && distance <= ALLOWED_RADIUS_METERS

        try {
          await sql`
            INSERT INTO login_locations (username, latitude, longitude, distance_meters, accepted)
            VALUES (${user.username}, ${hasLocation ? lat : null}, ${hasLocation ? lng : null}, ${distance}, ${accepted})
          `
        } catch (e) {
          console.error('login_locations insert failed (non-fatal):', e)
        }

        if (!hasLocation) throw new LocationError()
        if (!accepted) throw new TooFarError()

        return { id: String(user.id), name: user.display_name, username: user.username, role: user.role }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) { token.role = (user as any).role; token.username = (user as any).username }
      return token
    },
    session({ session, token }) {
      if (session.user) { (session.user as any).role = token.role; (session.user as any).username = token.username }
      return session
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  events: {
    async signIn({ user }) {
      const name = (user as any)?.username ?? user?.name ?? 'Unknown'
      try { await logActivity(name, 'logged in', '') } catch {}
    },
    async signOut(message: any) {
      const name = message?.token?.username ?? message?.token?.name ?? message?.session?.user?.username ?? 'Unknown'
      try { await logActivity(name, 'logged out', '') } catch {}
    },
  },
})
