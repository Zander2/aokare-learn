"use server"

import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { createModuleSchema, updateModuleSchema } from "@/lib/validators/module"
import {
  createModule,
  updateModule,
  deleteModule,
  getModuleById,
} from "@/lib/services/module-service"
import { getCourseById } from "@/lib/services/course-service"
import type { Module } from "@prisma/client"

type ActionResult<T = null> = {
  success: boolean
  error?: string
  data?: T
}

async function getCourseSlugFromCourseId(courseId: string): Promise<string | null> {
  const course = await getCourseById(courseId)
  return course?.slug ?? null
}

export async function createModuleAction(
  formData: FormData
): Promise<ActionResult<Module>> {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "Admin access required" }
  }

  const raw = {
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    order: Number(formData.get("order")),
  }

  const parsed = createModuleSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    }
  }

  try {
    const mod = await createModule(parsed.data)
    revalidatePath("/admin/courses")
    const slug = await getCourseSlugFromCourseId(parsed.data.courseId)
    if (slug) revalidatePath(`/courses/${slug}`)
    return { success: true, data: mod }
  } catch {
    return { success: false, error: "Failed to create module" }
  }
}

export async function updateModuleAction(
  moduleId: string,
  formData: FormData
): Promise<ActionResult<Module>> {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "Admin access required" }
  }

  const raw = {
    title: formData.get("title") || undefined,
    description: formData.get("description") || undefined,
    order: formData.get("order") ? Number(formData.get("order")) : undefined,
  }

  const parsed = updateModuleSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    }
  }

  try {
    const existing = await getModuleById(moduleId)
    const mod = await updateModule(moduleId, parsed.data)
    revalidatePath("/admin/courses")
    if (existing) {
      const slug = await getCourseSlugFromCourseId(existing.courseId)
      if (slug) revalidatePath(`/courses/${slug}`)
    }
    return { success: true, data: mod }
  } catch {
    return { success: false, error: "Failed to update module" }
  }
}

export async function deleteModuleAction(
  moduleId: string
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "Admin access required" }
  }

  try {
    const existing = await getModuleById(moduleId)
    await deleteModule(moduleId)
    revalidatePath("/admin/courses")
    if (existing) {
      const slug = await getCourseSlugFromCourseId(existing.courseId)
      if (slug) revalidatePath(`/courses/${slug}`)
    }
    return { success: true }
  } catch {
    return { success: false, error: "Failed to delete module" }
  }
}
