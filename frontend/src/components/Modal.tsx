import { X } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { errorMessage } from '../api/client'

export function Modal({ title, children, close, busy = false }: {
  title: string; children: ReactNode; close: () => void; busy?: boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useLayoutEffect(() => {
    const element = dialog.current
    const opener = document.activeElement
    element?.showModal()
    return () => {
      element?.close()
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])

  return <dialog ref={dialog} className="modal" aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); if (!busy) close() }}>
    <div className="modal-header">
      <h2 id={titleId}>{title}</h2>
      <button type="button" className="icon-button" aria-label="Close dialog" disabled={busy} onClick={close}><X size={19} /></button>
    </div>
    {children}
  </dialog>
}

export function ModalActions({ close, busy, label, disabled, submit }: {
  close: () => void; busy?: boolean; label: string; disabled?: boolean; submit?: () => void
}) {
  const backButton = useRef<HTMLButtonElement>(null)
  const confirming = !!submit
  useEffect(() => {
    if (confirming) backButton.current?.focus()
  }, [confirming])

  return <div className="modal-actions">
    <button ref={backButton} className="button button-secondary" type="button" onClick={close} disabled={busy}>
      {confirming ? 'Back' : 'Cancel'}
    </button>
    <button className="button button-primary" type={submit ? 'button' : 'submit'}
      disabled={busy || disabled} onClick={submit}>{busy ? 'Saving…' : label}</button>
  </div>
}

export function useSave() {
  const active = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save<T>(action: () => Promise<T>, done: (result: T) => void) {
    if (active.current) return
    active.current = true
    setBusy(true)
    setError('')
    try {
      done(await action())
    } catch (failure) {
      setError(errorMessage(failure))
    } finally {
      active.current = false
      setBusy(false)
    }
  }
  return { save, busy, error, setError }
}
