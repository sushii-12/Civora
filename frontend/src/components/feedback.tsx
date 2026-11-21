import { CircleAlert, Inbox, LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'

export function Loading({ label = 'Loading records…' }: { label?: string }) {
  return <div className="state" role="status"><LoaderCircle className="spin" size={24} />{label}</div>
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="state">
    <span className="state-icon"><Inbox size={22} /></span>
    <strong>{title}</strong>
    {children && <p>{children}</p>}
  </div>
}

export function ErrorNotice({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="notice notice-error" role="alert">
    <CircleAlert size={18} />
    <span>{message}</span>
    {retry && <button className="button button-quiet" type="button" onClick={retry}>Try again</button>}
  </div>
}
