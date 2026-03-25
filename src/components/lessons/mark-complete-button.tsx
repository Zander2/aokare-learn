"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { markLessonCompleteAction, markLessonIncompleteAction } from "@/lib/actions/progress-actions"
import { toast } from "sonner"
import { CheckCircle2, Loader2 } from "lucide-react"

interface MarkCompleteButtonProps {
  lessonId: string
  isCompleted: boolean
}

export function MarkCompleteButton({ lessonId, isCompleted }: MarkCompleteButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      if (isCompleted) {
        const result = await markLessonIncompleteAction(lessonId)
        if (result.success) {
          toast.info("Lesson marked as incomplete")
          router.refresh()
        } else {
          toast.error(result.error ?? "Failed to update progress")
        }
      } else {
        const result = await markLessonCompleteAction(lessonId)
        if (result.success) {
          toast.success("Lesson marked as complete!")
          router.refresh()
        } else {
          toast.error(result.error ?? "Failed to update progress")
        }
      }
    })
  }

  return (
    <Button
      variant={isCompleted ? "outline" : "default"}
      onClick={handleToggle}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <CheckCircle2 className="size-4" />
      )}
      {isCompleted ? "Completed" : "Mark as Complete"}
    </Button>
  )
}
