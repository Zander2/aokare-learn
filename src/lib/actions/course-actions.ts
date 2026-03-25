"use server"

import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { createCourseSchema, updateCourseSchema } from "@/lib/validators/course"
import {
  createCourse,
  updateCourse,
  deleteCourse,
} from "@/lib/services/course-service"
import type { Course } from "@prisma/client"

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

type AdminInfo = { id: string; role: string }

async function requireAdmin(): Promise<
  AdminInfo | { success: false; error: string }
> {
  const session = await auth()
  if (!session?.user) {
    return { success: false, error: "Authentication required" }
  }
  if (session.user.role !== "ADMIN") {
    return { success: false, error: "Admin access required" }
  }
  return { id: session.user.id, role: session.user.role }
}

function isError(result: AdminInfo | { success: false; error: string }): result is { success: false; error: string } {
  return "success" in result && !result.success
}

export async function createCourseAction(
  formData: FormData
): Promise<ActionResult<Course>> {
  const adminCheck = await requireAdmin()
  if (isError(adminCheck)) return adminCheck

  const raw = {
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    status: formData.get("status") || "DRAFT",
  }

  const parsed = createCourseSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    }
  }

  try {
    const course = await createCourse(parsed.data)
    revalidatePath("/admin/courses")
    revalidatePath("/courses")
    return { success: true, data: course }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create course"
    return { success: false, error: message }
  }
}

export async function updateCourseAction(
  courseId: string,
  formData: FormData
): Promise<ActionResult<Course>> {
  const adminCheck = await requireAdmin()
  if (isError(adminCheck)) return adminCheck

  const raw = {
    title: formData.get("title") || undefined,
    slug: formData.get("slug") || undefined,
    description: formData.get("description") || undefined,
    status: formData.get("status") || undefined,
  }

  const parsed = updateCourseSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    }
  }

  try {
    const course = await updateCourse(courseId, parsed.data)
    revalidatePath("/admin/courses")
    revalidatePath("/courses")
    revalidatePath(`/courses/${course.slug}`)
    return { success: true, data: course }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update course"
    return { success: false, error: message }
  }
}

export async function deleteCourseAction(
  courseId: string
): Promise<ActionResult> {
  const adminCheck = await requireAdmin()
  if (isError(adminCheck)) return adminCheck

  try {
    await deleteCourse(courseId)
    revalidatePath("/admin/courses")
    revalidatePath("/courses")
    return { success: true }
  } catch {
    return { success: false, error: "Failed to delete course" }
  }
}

export async function publishCourseAction(
  courseId: string
): Promise<ActionResult<Course>> {
  const adminCheck = await requireAdmin()
  if (isError(adminCheck)) return adminCheck

  try {
    const course = await updateCourse(courseId, { status: "PUBLISHED" })
    revalidatePath("/admin/courses")
    revalidatePath("/courses")
    return { success: true, data: course }
  } catch {
    return { success: false, error: "Failed to publish course" }
  }
}
