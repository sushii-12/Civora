import {
  ChevronDown, ChevronRight, ClipboardList, Flag, LayoutDashboard, LogOut,
  MapPin, Menu, PackageOpen, UsersRound, X,
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import type { User } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Brand } from './ui'

const navigation = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/collection-points', label: 'Collection Points', icon: MapPin },
  { to: '/waste-deposits', label: 'Waste Deposits', icon: PackageOpen },
  { to: '/collection-requests', label: 'Collection Requests', icon: ClipboardList },
  { to: '/worker-assignments', label: 'Worker Assignments', icon: UsersRound },
  { to: '/reports', label: 'Reports Management', icon: Flag },
]

function Sidebar({ logout, close }: { logout: () => void; close?: () => void }) {
  return <div className="sidebar-content">
    <div className="sidebar-top">
      <Brand />
      {close && <button aria-label="Close navigation" className="icon-button" type="button" onClick={close}><X size={20} /></button>}
    </div>
    <nav className="navigation" aria-label="Admin navigation">
      <p className="nav-label">Administration</p>
      {navigation.map(({ to, label, icon: Icon }) =>
        <NavLink key={to} to={to} end onClick={close}><Icon size={18} /><span>{label}</span></NavLink>)}
    </nav>
    <div className="sidebar-foot">
      <button type="button" className="sidebar-logout" onClick={logout}><LogOut size={18} />Logout</button>
    </div>
  </div>
}

export function Layout({ user }: { user: User }) {
  const { logout } = useAuth()
  const location = useLocation()
  const title = navigation.find(({ to }) => to === location.pathname)?.label ?? 'Page unavailable'
  const initials = user.full_name.trim().split(/\s+/).slice(0, 2).map((part) => part.slice(0, 1)).join('').toUpperCase() || 'A'
  const drawer = useRef<HTMLDialogElement>(null)
  const profile = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    document.title = `${title} · Civora Admin`
  }, [title])

  useEffect(() => {
    const media = window.matchMedia('(min-width: 901px)')
    const closeOnDesktop = () => { if (media.matches) drawer.current?.close() }
    const closeProfile = (event: PointerEvent) => {
      if (!profile.current?.contains(event.target as Node)) profile.current?.removeAttribute('open')
    }
    media.addEventListener('change', closeOnDesktop)
    document.addEventListener('pointerdown', closeProfile)
    return () => {
      media.removeEventListener('change', closeOnDesktop)
      document.removeEventListener('pointerdown', closeProfile)
    }
  }, [])

  return <div className="app-shell">
    <a className="skip-link" href="#content">Skip to content</a>
    <aside className="desktop-sidebar"><Sidebar logout={logout} /></aside>
    <dialog ref={drawer} className="nav-drawer" aria-label="Admin navigation"
      onClick={(event) => { if (event.target === event.currentTarget) drawer.current?.close() }}>
      <Sidebar logout={logout} close={() => drawer.current?.close()} />
    </dialog>
    <div className="workspace">
      <header className="topbar">
        <div className="topbar-start">
          <button type="button" className="icon-button drawer-toggle" aria-label="Open navigation"
            onClick={() => drawer.current?.showModal()}><Menu size={22} /></button>
          <nav aria-label="Breadcrumb" className="breadcrumbs">
            <span>Admin</span><ChevronRight aria-hidden="true" size={14} /><span aria-current="page">{title}</span>
          </nav>
        </div>
        <details className="profile" ref={profile} onKeyDown={(event) => {
          if (event.key === 'Escape' && profile.current?.open) {
            profile.current.open = false
            profile.current.querySelector('summary')?.focus()
          }
        }}>
          <summary aria-label="Administrator profile">
            <span className="avatar" aria-hidden="true">{initials}</span>
            <span className="profile-label"><strong>{user.full_name}</strong><small>Administrator</small></span>
            <ChevronDown aria-hidden="true" size={15} />
          </summary>
          <div className="profile-menu surface">
            <strong>{user.full_name}</strong><span>{user.email}</span>
            <button type="button" className="button button-quiet" onClick={logout}><LogOut size={16} />Logout</button>
          </div>
        </details>
      </header>
      <main id="content" tabIndex={-1} className="main-content"><Outlet /></main>
    </div>
  </div>
}
