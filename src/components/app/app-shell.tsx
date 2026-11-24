"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { CalendarDays, GitCompare, Home, LogOut, Menu, Package, Route, SlidersHorizontal, Truck } from "lucide-react"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tag } from "@/components/app/bits"
import { useAuth, type User } from "@/lib/auth"
import { PLAN_DATE, formatPlanDate } from "@/lib/data"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

const NAV = [
  { group: "Operations", items: [
    { href: "/", label: "Overview", icon: Home },
    { href: "/planning", label: "Dispatch planning", icon: Route },
    { href: "/deliveries", label: "Deliveries", icon: Package },
    { href: "/vehicles", label: "Fleet & vehicles", icon: Truck }, 
  ] },
  { group: "Planning tools", items: [
    { href: "/scenarios", label: "Scenarios", icon: GitCompare },
    { href: "/rules", label: "Business rules", icon: SlidersHorizontal }, 
  ] },
]

function Brand() {
  return (
    <Link href="/" className="routewise-brand" aria-label="RouteWyse home">
      <Image src="/routewys-logo.webp" alt="" width={2124} height={486} unoptimized />
    </Link>
  )
}

function Navigation({ path, onNavigate }: { path: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main navigation" className="routewise-nav">
      {NAV.map(({ group, items }) => (
        <div key={group} className="routewise-nav-group">
          <p>{group}</p>
          {items.map(({ href, label, icon: Icon }) => {
            const active = path === href
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("routewise-nav-link", active && "is-current")} onClick={onNavigate}>
                <Icon aria-hidden="true" size={18} />
                {label}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

const PUBLIC = ["/login", "/signup"]

function SessionControls({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  return (
    <div className="relative space-y-2 rounded-lg border border-white/15 bg-[#142f39] p-2.5">
      <ThemeToggle className="bg-card" />
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium">{user.name}</div>
          <div className="truncate text-[11px] text-slate-300">{user.role} · {user.depot}</div>
        </div>
        <button type="button" className="rounded-md p-1.5 hover:bg-white/10" aria-label="Sign out" onClick={onSignOut}><LogOut size={16} /></button>
      </div>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const router = useRouter()
  const { user, ready, logout } = useAuth()
  const { status, rulesVersion } = useStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isPublic = PUBLIC.includes(path)

  useEffect(() => {
    if (!ready) return
    if (!user && !isPublic) router.replace("/login")
    if (user && isPublic) router.replace("/")
  }, [ready, user, isPublic, router])

  if (isPublic) return <>{children}</>
  if (!ready || !user) return <div className="grid min-h-screen place-items-center"><div role="status" aria-label="Loading workspace" className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>

  const signOut = () => {
    setMobileOpen(false)
    logout()
    router.replace("/login")
  }

  return (
    <div className="routewise-shell">
      <a className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-card focus:p-3" href="#main-content">Skip to content</a>
      <aside className="routewise-sidebar">
        <Brand />
        <Navigation path={path} />
        <div className="routewise-sidebar-footer">
          <CalendarDays aria-hidden="true" size={18} />
          <div><strong>{formatPlanDate(PLAN_DATE)}</strong><small>Sample plan · Rules {rulesVersion}</small></div>
          {status !== "None" && <Tag tone={status === "Draft" ? "amber" : "green"}>{status}</Tag>}
        </div>
        <SessionControls user={user} onSignOut={signOut} />
      </aside>
      <header className="routewise-mobile">
        <Brand />
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger render={<Button size="icon" variant="outline" aria-label="Open navigation" />}><Menu aria-hidden="true" /></SheetTrigger>
          <SheetContent side="left" className="routewise-drawer">
            <SheetTitle className="sr-only">RouteWyse navigation</SheetTitle>
            <Brand />
            <Navigation path={path} onNavigate={() => setMobileOpen(false)} />
            <SessionControls user={user} onSignOut={signOut} />
          </SheetContent>
        </Sheet>
      </header>
      <main id="main-content" className="routewise-main" tabIndex={-1}>
        {children}
      </main>
    </div>
  )
}
