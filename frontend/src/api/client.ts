import axios from 'axios'

const storageKey = 'civora.admin.session'
export const sessionRejectedEvent = 'civora-session-rejected'
let token: string | null = null

try {
  token = window.sessionStorage.getItem(storageKey)
} catch {
  // Private browsing or browser policy may restrict session storage.
}

export function getToken() { return token }

export function setToken(value: string | null) {
  token = value
  try {
    if (value) window.sessionStorage.setItem(storageKey, value)
    else window.sessionStorage.removeItem(storageKey)
  } catch {
    // The active tab can still authenticate with the in-memory token.
  }
}

const config = {
  baseURL: import.meta.env.VITE_API_BASE_URL?.trim() || 'http://127.0.0.1:8000',
  timeout: 15000,
}

export const publicApi = axios.create(config)
export const api = axios.create(config)

api.interceptors.request.use((request) => {
  if (token) request.headers.set('Authorization', `Bearer ${token}`)
  return request
})

api.interceptors.response.use(undefined, (error: unknown) => {
  const status = statusCode(error)
  if ((status === 401 || status === 403) && token && axios.isAxiosError(error) &&
      error.config?.headers.get('Authorization') === `Bearer ${token}`) {
    setToken(null)
    window.dispatchEvent(new CustomEvent(sessionRejectedEvent, { detail: status }))
  }
  return Promise.reject(error)
})

export function statusCode(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}

export function errorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return 'Something went wrong. Please try again.'
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return 'The API took too long to respond. Please try again.'
  }
  if (!error.response) return 'Could not reach the Civora API. Check the connection and try again.'

  const { status, data } = error.response
  const detail: unknown = data?.detail
  const message = typeof detail === 'string' ? detail : undefined

  switch (status) {
    case 400: return message ?? 'The API could not apply this change.'
    case 401: return message ?? 'Your session has expired. Please sign in again.'
    case 403: return message ?? 'You do not have permission to do this.'
    case 404: return message ?? 'This record could not be found.'
    case 422: {
      if (!Array.isArray(detail)) return message ?? 'Review the information and try again.'
      const messages = detail.map((item: { loc?: unknown[]; msg?: string }) => {
        const field = item.loc?.slice(1).join(' ').replaceAll('_', ' ')
        return [field, item.msg].filter(Boolean).join(': ')
      }).filter(Boolean)
      return messages.join('. ') || 'Review the information and try again.'
    }
    default: return status >= 500
      ? 'The Civora API encountered a server error. Please try again.'
      : 'The request could not be completed. Please try again.'
  }
}
