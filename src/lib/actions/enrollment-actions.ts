"use server"

import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import {
  enrollUser,
  deleteEnrollment,
} from "@/lib/services/enrollment-service"
import type { Enrollment } from "@prisma/client"

type ActionResult<T = null> = {
  success: boolean
  error?: string
  data?: T
}

export async function enrollAction(
  courseId: string
): Promise<ActionResult<Enrollment>> {
  const session = await auth()
  if (!session?.user) {
    return { success: false, error: "Authentication required" }
  }

  try {
    const enrollment = await enrollUser(session.user.id, courseId)
    revalidatePath("/dashboard")
    revalidatePath("/courses")
    return { success: true, data: enrollment }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to enroll"
    return { success: false, error: message }
  }
}

export async function unenrollAction(
  courseId: string
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user) {
    return { success: false, error: "Authentication required" }
  }

  try {
    await deleteEnrollment(session.user.id, courseId)
    revalidatePath("/dashboard")
    revalidatePath("/courses")
    return { success: true }
  } catch {
    return { success: false, error: "Failed to unenroll" }
  }
}
