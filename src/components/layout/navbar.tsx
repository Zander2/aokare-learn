"use client"

import Link from "next/link"
import { signOut } from "next-auth/react"
import type { User } from "@/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { LayoutDashboard, LogOut, Shield } from "lucide-react"

interface NavbarProps {
  user: User | null
}

function getInitials(name: string | null): string {
  if (!name) return "U"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function Navbar({ user }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-stone-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="text-xl font-semibold text-olive-deep"
        >
          A<sup className="text-xs">2</sup>
        </Link>

        <nav>
          <Link
            href="/courses"
            className="text-sm font-medium text-text-primary hover:text-olive-deep"
          >
            Courses
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="cursor-pointer rounded-full outline-none">
                <Avatar size="default">
                  {user.image && <AvatarImage src={user.image} />}
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8}>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-text-primary">
                        {user.name}
                      </span>
                      <span className="text-xs text-text-muted">{user.email}</span>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem render={<Link href="/dashboard" />}>
                    <LayoutDashboard className="size-4" />
                    Dashboard
                  </DropdownMenuItem>
                  {user.role === "ADMIN" && (
                    <DropdownMenuItem render={<Link href="/admin" />}>
                      <Shield className="size-4" />
                      Admin
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    <LogOut className="size-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" render={<Link href="/login" />}>
                Login
              </Button>
              <Button render={<Link href="/register" />}>Register</Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
