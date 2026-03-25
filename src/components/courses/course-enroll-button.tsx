"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { enrollAction } from "@/lib/actions/enrollment-actions"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import Link from "next/link"

interface CourseEnrollButtonProps {
  courseId: string
  isLoggedIn: boolean
}

export function CourseEnrollButton({ courseId, isLoggedIn }: CourseEnrollButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (!isLoggedIn) {
    return (
      <Button render={<Link href="/login" />}>
        Sign in to Enroll
      </Button>
    )
  }

  function handleEnroll() {
    startTransition(async () => {
      const result = await enrollAction(courseId)
      if (result.success) {
        toast.success("Successfully enrolled!")
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed to enroll")
      }
    })
  }

  return (
    <Button onClick={handleEnroll} disabled={isPending}>
      {isPending && <Loader2 className="size-4 animate-spin" />}
      Enroll Now
    </Button>
  )
}
