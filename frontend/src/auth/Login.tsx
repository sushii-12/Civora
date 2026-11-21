import { Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { errorMessage } from '../api/client'
import { ErrorNotice, Loading } from '../components/feedback'
import { Brand } from '../components/ui'
import { useAuth } from './AuthContext'

function AuthShell({ children }: { children: React.ReactNode }) {
  return <main className="auth-shell">
    <div className="auth-cover">
      <Brand />
      <div className="auth-cover-text">
        <h2>Cleaner cities.<br />Smarter communities.</h2>
        <p>Municipal waste operations, from collection points to citizen reports.</p>
      </div>
      <div className="cover-pattern" aria-hidden="true"><span /><span /><span /><span /></div>
    </div>
    <section className="auth-main"><div className="auth-content">{children}</div></section>
  </main>
}

export function Login() {
  const { session, login } = useAuth()
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const active = useRef<AbortController | null>(null)
  useEffect(() => {
    document.title = 'Admin sign in · Civora'
    return () => active.current?.abort()
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (active.current) return
    const fields = new FormData(event.currentTarget)
    const email = String(fields.get('email')).trim()
    const password = String(fields.get('password'))
    const request = new AbortController()
    active.current = request
    setBusy(true)
    setError('')
    try {
      await login(email, password, request.signal)
    } catch (failure) {
      if (!request.signal.aborted) setError(errorMessage(failure))
    } finally {
      active.current = null
      if (!request.signal.aborted) setBusy(false)
    }
  }

  return <AuthShell>
    <span className="auth-icon"><LockKeyhole size={25} /></span>
    <h1>Admin sign in</h1>
    <p>Use your Civora administrator account to continue.</p>
    {session.status === 'anonymous' && session.message && !error && <div role="status" className="notice">{session.message}</div>}
    {error && <ErrorNotice message={error} />}
    <form onSubmit={submit} className="form-stack">
      <label>Email address
        <input required name="email" type="email" autoComplete="username" placeholder="name@example.com" disabled={busy} />
      </label>
      <label>Password
        <span className="password-field">
          <input required name="password" type={visible ? 'text' : 'password'} autoComplete="current-password" disabled={busy} />
          <button className="icon-button" type="button" aria-label={visible ? 'Hide password' : 'Show password'}
            onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </span>
      </label>
      <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  </AuthShell>
}

export function SessionGate() {
  const { session, logout, retry } = useAuth()
  useEffect(() => {
    document.title = session.status === 'denied' ? 'Access denied · Civora' : 'Civora Admin'
  }, [session.status])

  return <AuthShell>
    {session.status === 'checking' && <Loading label="Checking your session…" />}
    {session.status === 'denied' && <>
      <span className="auth-icon"><ShieldCheck size={26} /></span>
      <h1>Access denied</h1>
      <p>{session.message}</p>
      <button className="button button-primary" onClick={logout}>Return to sign in</button>
    </>}
    {session.status === 'error' && <>
      <h1>Session unavailable</h1>
      <ErrorNotice message={session.message} retry={retry} />
      <button className="button button-secondary" onClick={logout}>Return to sign in</button>
    </>}
  </AuthShell>
}
