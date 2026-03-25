"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface CourseSearchBarProps {
  defaultValue: string
}

export function CourseSearchBar({ defaultValue }: CourseSearchBarProps) {
  const router = useRouter()
  const [search, setSearch] = useState(defaultValue)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (search.trim()) {
      router.push(`/courses?q=${encodeURIComponent(search.trim())}`)
    } else {
      router.push("/courses")
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
        <Input
          placeholder="Search courses..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
    </form>
  )
}
