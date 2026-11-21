import { CircleCheck, X } from 'lucide-react'
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

const ToastContext = createContext<(text: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<{ text: string }>()
  useEffect(() => {
    if (!message) return
    const timeout = window.setTimeout(() => setMessage(undefined), 5000)
    return () => window.clearTimeout(timeout)
  }, [message])
  return <ToastContext.Provider value={(text) => setMessage({ text })}>
    {children}
    <div className="toast-region" aria-live="polite">
      {message && <div className="toast surface">
        <CircleCheck size={20} /><span>{message.text}</span>
        <button className="icon-button" aria-label="Dismiss notification" type="button" onClick={() => setMessage(undefined)}><X size={16} /></button>
      </div>}
    </div>
  </ToastContext.Provider>
}

export const useToast = () => useContext(ToastContext)
