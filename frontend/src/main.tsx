import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { Login, SessionGate } from './auth/Login'
import { Layout } from './components/Layout'
import { PageHeading } from './components/ui'
import { ToastProvider } from './components/Toast'
import { Loading } from './components/feedback'
import { CollectionPoints } from './features/CollectionPoints'
import { WasteDeposits } from './features/WasteDeposits'
import { CollectionRequests } from './features/CollectionRequests'
import { WorkerAssignments } from './features/WorkerAssignments'
import { Reports } from './features/Reports'
import './styles.css'

const Dashboard = lazy(() => import('./features/Dashboard').then(({ Dashboard }) => ({ default: Dashboard })))

function ProtectedLayout() {
  const { session } = useAuth()
  const location = useLocation()
  if (session.status === 'anonymous') return <Navigate to="/login" state={{ from: location }} replace />
  if (session.status !== 'authenticated') return <SessionGate />
  return <Layout user={session.user} />
}

function LoginRoute() {
  const { session } = useAuth()
  const location = useLocation()
  if (session.status === 'authenticated') {
    const from = location.state?.from
    const destination = from && typeof from.pathname === 'string' && from.pathname.startsWith('/') &&
      !from.pathname.startsWith('//') && from.pathname !== '/login' ? from : '/'
    return <Navigate to={destination} replace />
  }
  return session.status === 'anonymous' ? <Login /> : <SessionGate />
}

function Missing() {
  return <PageHeading title="Page unavailable" description="Choose a section from the navigation to continue."
    action={<Link className="button button-secondary" to="/">Back to dashboard</Link>} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider><ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route element={<ProtectedLayout />}>
            <Route index element={<Suspense fallback={<Loading label="Loading dashboard…" />}><Dashboard /></Suspense>} />
            <Route path="collection-points" element={<CollectionPoints />} />
            <Route path="waste-deposits" element={<WasteDeposits />} />
            <Route path="collection-requests" element={<CollectionRequests />} />
            <Route path="worker-assignments" element={<WorkerAssignments />} />
            <Route path="reports" element={<Reports />} />
            <Route path="*" element={<Missing />} />
          </Route>
        </Routes>
      </ToastProvider></AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
