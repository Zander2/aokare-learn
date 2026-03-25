"use server"

import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import {
  markLessonComplete,
  markLessonIncomplete,
  checkAndCompleteCourse,
} from "@/lib/services/progress-service"
import { getLessonById } from "@/lib/services/lesson-service"
import type { Progress } from "@prisma/client"

type ActionResult<T = null> = {
  success: boolean
  error?: string
  data?: T
}

export async function markLessonCompleteAction(
  lessonId: string
): Promise<ActionResult<Progress>> {
  const session = await auth()
  if (!session?.user) {
    return { success: false, error: "Authentication required" }
  }

  try {
    const progress = await markLessonComplete(session.user.id, lessonId)

    // Check if course is now complete
    const lesson = await getLessonById(lessonId)
    if (lesson) {
      await checkAndCompleteCourse(
        session.user.id,
        lesson.module.course.id
      )
    }

    revalidatePath("/dashboard")
    return { success: true, data: progress }
  } catch {
    return { success: false, error: "Failed to mark lesson complete" }
  }
}

export async function markLessonIncompleteAction(
  lessonId: string
): Promise<ActionResult<Progress>> {
  const session = await auth()
  if (!session?.user) {
    return { success: false, error: "Authentication required" }
  }

  try {
    const progress = await markLessonIncomplete(session.user.id, lessonId)
    revalidatePath("/dashboard")
    return { success: true, data: progress }
  } catch {
    return { success: false, error: "Failed to mark lesson incomplete" }
  }
}
