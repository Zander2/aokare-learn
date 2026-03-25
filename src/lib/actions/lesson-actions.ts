"use server"

import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { createLessonSchema, updateLessonSchema } from "@/lib/validators/lesson"
import {
  createLesson,
  updateLesson,
  deleteLesson,
  getLessonById,
} from "@/lib/services/lesson-service"
import { getModuleById } from "@/lib/services/module-service"
import { getCourseById } from "@/lib/services/course-service"
import type { Lesson } from "@prisma/client"

type ActionResult<T = null> = {
  success: boolean
  error?: string
  data?: T
}

async function getCourseSlugFromModuleId(moduleId: string): Promise<string | null> {
  const mod = await getModuleById(moduleId)
  if (!mod) return null
  const course = await getCourseById(mod.courseId)
  return course?.slug ?? null
}

export async function createLessonAction(
  formData: FormData
): Promise<ActionResult<Lesson>> {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "Admin access required" }
  }

  const contentBodyRaw = formData.get("contentBody")
  let contentBody: unknown = []
  if (typeof contentBodyRaw === "string") {
    try {
      contentBody = JSON.parse(contentBodyRaw)
    } catch {
      return { success: false, error: "Invalid content body JSON" }
    }
  }

  const raw = {
    moduleId: formData.get("moduleId"),
    title: formData.get("title"),
    order: Number(formData.get("order")),
    contentType: formData.get("contentType") || "TEXT",
    contentBody,
  }

  const parsed = createLessonSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    }
  }

  try {
    const lesson = await createLesson(parsed.data)
    revalidatePath("/admin/courses")
    const slug = await getCourseSlugFromModuleId(parsed.data.moduleId)
    if (slug) revalidatePath(`/courses/${slug}`)
    return { success: true, data: lesson }
  } catch {
    return { success: false, error: "Failed to create lesson" }
  }
}

export async function updateLessonAction(
  lessonId: string,
  formData: FormData
): Promise<ActionResult<Lesson>> {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "Admin access required" }
  }

  const contentBodyRaw = formData.get("contentBody")
  let contentBody: unknown | undefined
  if (typeof contentBodyRaw === "string") {
    try {
      contentBody = JSON.parse(contentBodyRaw)
    } catch {
      return { success: false, error: "Invalid content body JSON" }
    }
  }

  const raw = {
    title: formData.get("title") || undefined,
    order: formData.get("order") ? Number(formData.get("order")) : undefined,
    contentType: formData.get("contentType") || undefined,
    contentBody,
  }

  const parsed = updateLessonSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    }
  }

  try {
    const lesson = await updateLesson(lessonId, parsed.data)
    revalidatePath("/admin/courses")
    const existing = await getLessonById(lessonId)
    if (existing) {
      const slug = await getCourseSlugFromModuleId(existing.moduleId)
      if (slug) revalidatePath(`/courses/${slug}`)
    }
    return { success: true, data: lesson }
  } catch {
    return { success: false, error: "Failed to update lesson" }
  }
}

export async function deleteLessonAction(
  lessonId: string
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "Admin access required" }
  }

  try {
    const existing = await getLessonById(lessonId)
    await deleteLesson(lessonId)
    revalidatePath("/admin/courses")
    if (existing) {
      const slug = await getCourseSlugFromModuleId(existing.moduleId)
      if (slug) revalidatePath(`/courses/${slug}`)
    }
    return { success: true }
  } catch {
    return { success: false, error: "Failed to delete lesson" }
  }
}
