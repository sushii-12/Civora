import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { errorMessage, getToken, sessionRejectedEvent, setToken } from '../api/client'
import { getProfile, signIn } from '../api/endpoints'
import type { User } from '../api/types'

const deniedSession = {
  status: 'denied',
  message: 'Your account does not have administrator access to Civora.',
} as const

type Session =
  | { status: 'checking' }
  | { status: 'anonymous'; message?: string }
  | { status: 'authenticated'; user: User }
  | typeof deniedSession
  | { status: 'error'; message: string }

const AuthContext = createContext<{
  session: Session
  login: (email: string, password: string, signal: AbortSignal) => Promise<void>
  logout: () => void
  retry: () => void
} | null>(null)

function expiresAt(token: string) {
  try {
    const decoded: { exp?: number } = JSON.parse(atob(token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/')))
    return Number(decoded.exp) * 1000
  } catch {
    return NaN
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(() =>
    getToken() ? { status: 'checking' } : { status: 'anonymous' })
  const [attempt, setAttempt] = useState(0)

  const expire = useCallback(() => {
    setToken(null)
    setSession({ status: 'anonymous', message: 'Your session expired. Please sign in again.' })
  }, [])

  const acceptProfile = useCallback((user: User, accessToken: string) => {
    if (user.role === 'admin' && user.is_active) {
      if (getToken() !== accessToken) setToken(accessToken)
      setSession({ status: 'authenticated', user })
    } else {
      setToken(null)
      setSession(deniedSession)
    }
  }, [])

  useEffect(() => {
    function rejectSession(event: Event) {
      if ((event as CustomEvent<number>).detail === 403) setSession(deniedSession)
      else expire()
    }
    window.addEventListener(sessionRejectedEvent, rejectSession)
    return () => window.removeEventListener(sessionRejectedEvent, rejectSession)
  }, [expire])

  useEffect(() => {
    let pending: AbortController | undefined

    async function verifyProfile(showError: boolean) {
      const accessToken = getToken()
      if (!accessToken || pending) return
      const request = new AbortController()
      pending = request
      try {
        const profile = await getProfile(request.signal)
        if (!request.signal.aborted && getToken() === accessToken) acceptProfile(profile, accessToken)
      } catch (error) {
        if (showError && !request.signal.aborted && getToken() === accessToken) {
          setSession({ status: 'error', message: errorMessage(error) })
        }
      } finally {
        pending = undefined
      }
    }

    void verifyProfile(true)
    const onFocus = () => { void verifyProfile(false) }
    const onVisibilityChange = () => { if (!document.hidden) onFocus() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      pending?.abort()
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [attempt, acceptProfile])

  useEffect(() => {
    const token = getToken()
    if (!token) return
    const deadline = expiresAt(token)
    if (!Number.isFinite(deadline)) return

    let timeout: number
    const check = () => {
      window.clearTimeout(timeout)
      if (getToken() !== token) return
      const remaining = deadline - Date.now()
      if (remaining <= 0) expire()
      else timeout = window.setTimeout(check, Math.min(remaining, 2_147_483_647))
    }
    check()
    window.addEventListener('focus', check)
    return () => {
      window.clearTimeout(timeout)
      window.removeEventListener('focus', check)
    }
  }, [session, expire])

  async function login(email: string, password: string, signal: AbortSignal) {
    const { access_token } = await signIn(email, password, signal)
    const profile = await getProfile(signal, access_token)
    if (signal.aborted) return
    acceptProfile(profile, access_token)
  }

  function logout() {
    setToken(null)
    setSession({ status: 'anonymous' })
  }

  function retry() {
    if (!getToken()) return
    setSession({ status: 'checking' })
    setAttempt((value) => value + 1)
  }

  return <AuthContext.Provider value={{ session, login, logout, retry }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('AuthProvider is missing')
  return auth
}
