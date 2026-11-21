import { useEffect, useState } from 'react'
import { errorMessage } from '../api/client'

type ResourceState<T> =
  | { status: 'loading'; data?: undefined; error?: undefined }
  | { status: 'ready'; data: T; error?: undefined }
  | { status: 'error'; data?: undefined; error: string }

export function useResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [stored, setStored] = useState<{ load: typeof load; state: ResourceState<T> }>({
    load, state: { status: 'loading' },
  })
  const [revision, setRevision] = useState(0)
  const state = stored.load === load ? stored.state : { status: 'loading' as const }

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setStored({ load, state: { status: 'ready', data } })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setStored({ load, state: { status: 'error', error: errorMessage(error) } })
      },
    )
    return () => controller.abort()
  }, [load, revision])

  return {
    ...state,
    retry: () => {
      setStored({ load, state: { status: 'loading' } })
      setRevision((value) => value + 1)
    },
    update: (apply: (data: T) => T) => {
      setStored((current) => current.load === load && current.state.status === 'ready'
        ? { load, state: { status: 'ready', data: apply(current.state.data) } }
        : current)
    },
  }
}
