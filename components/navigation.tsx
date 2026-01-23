"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  Search,
  FileText,
  DollarSign,
  BookOpen,
  Menu,
  X,
  BarChart3,
  Layers,
  User,
  LogOut,
} from "lucide-react"
import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Navigation() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const links = [
    { href: "/", label: "Home" },
    { href: "/search", label: "Search", icon: Search },
    { href: "/batch-search", label: "Batch", icon: Layers },
    { href: "/reports", label: "Reports", icon: FileText },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/pricing", label: "Pricing", icon: DollarSign },
    { href: "/api-docs", label: "API Docs", icon: BookOpen },
  ]

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3">
              <img src="/mase-logo.jpg" alt="MASE Intelligence" className="h-10 w-10 rounded-lg object-cover" />
              <div className="flex flex-col">
                <span className="text-lg font-bold leading-none tracking-tight">MASE Intelligence</span>
                <span className="text-xs text-muted-foreground leading-none">Skip-Tracer</span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {links.map((link) => {
                const Icon = link.icon
                const isActive = pathname === link.href
                return (
                  <Link key={link.href} href={link.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-2"
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      {link.label}
                    </Button>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {status === "loading" ? (
              <div className="h-9 w-20 bg-muted animate-pulse rounded" />
            ) : session ? (
              <>
                <Link href="/account">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    Account
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      {session.user?.name || session.user?.email}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{session.user?.name || "User"}</p>
                        <p className="text-xs text-muted-foreground">{session.user?.email}</p>
                        <p className="text-xs text-muted-foreground">Plan: {session.user?.plan}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/account" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Account Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/analytics" className="cursor-pointer">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Analytics
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="cursor-pointer text-destructive"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href="/auth/signin">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="space-y-1 px-4 py-3">
            {links.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start gap-2"
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    {link.label}
                  </Button>
                </Link>
              )
            })}
            <div className="pt-4 space-y-2">
              <Button variant="outline" size="sm" className="w-full bg-transparent">
                Sign In
              </Button>
              <Button size="sm" className="w-full">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
