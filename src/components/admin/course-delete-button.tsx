"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"
import { deleteCourseAction } from "@/lib/actions/course-actions"
import { toast } from "sonner"

interface AdminCourseDeleteButtonProps {
  courseId: string
}

export function AdminCourseDeleteButton({ courseId }: AdminCourseDeleteButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this course? This action cannot be undone.")) {
      return
    }

    startTransition(async () => {
      const result = await deleteCourseAction(courseId)
      if (result.success) {
        toast.success("Course deleted successfully")
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleDelete}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Trash2 className="size-4 text-red-500" />
      )}
    </Button>
  )
}
