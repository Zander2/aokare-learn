"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LayoutDashboard, BookOpen, ArrowLeft, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

const sidebarLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
]

function getInitials(name: string | null | undefined): string {
  if (!name) return "AD"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-56 flex-col border-r border-border bg-stone-white">
        <div className="flex h-14 items-center border-b border-border px-4">
          <Link
            href="/"
            className="text-xl font-semibold text-olive-deep"
          >
            A<sup className="text-xs">2</sup>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {sidebarLinks.map((link) => {
            const isActive =
              link.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-olive text-white"
                    : "text-text-primary hover:bg-olive/10"
                )}
              >
                <link.icon className="size-4" />
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-border p-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded px-3 py-2 text-sm text-text-muted hover:text-text-primary"
          >
            <ArrowLeft className="size-4" />
            Back to site
          </Link>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border bg-stone-white px-6">
          <h1 className="text-sm font-semibold text-olive-deep">
            Admin Panel
          </h1>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="size-4" />
              Sign Out
            </Button>
            <Avatar size="default">
              {session?.user?.image && <AvatarImage src={session.user.image} />}
              <AvatarFallback>{getInitials(session?.user?.name)}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1 bg-stone-white p-6">{children}</main>
      </div>
    </div>
  )
}
