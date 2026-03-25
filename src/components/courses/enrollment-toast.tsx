"use client"

import { useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"

export function EnrollmentToast() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const error = searchParams.get("error")

  useEffect(() => {
    if (error === "enrollment_required") {
      toast.error("Please enroll in this course to access lessons and quizzes.")
      // Clean up the URL
      const url = new URL(window.location.href)
      url.searchParams.delete("error")
      router.replace(url.pathname, { scroll: false })
    }
  }, [error, router])

  return null
}
