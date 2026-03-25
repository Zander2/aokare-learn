import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import {
  getCourseById,
  updateCourse,
  deleteCourse,
} from "@/lib/services/course-service"
import { updateCourseSchema } from "@/lib/validators/course"

type RouteParams = { params: { courseId: string } }

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const course = await getCourseById(params.courseId)
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }
    return NextResponse.json({ course })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = updateCourseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const course = await updateCourse(params.courseId, parsed.data)
    return NextResponse.json({ course })
  } catch (err) {
    if (
      err instanceof Error &&
      err.message === "A course with this slug already exists"
    ) {
      return NextResponse.json(
        { error: "A course with this slug already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update course" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }

    await deleteCourse(params.courseId)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "Failed to delete course" },
      { status: 500 }
    )
  }
}
