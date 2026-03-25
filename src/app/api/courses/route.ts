import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import {
  getAllPublishedCourses,
  searchCourses,
  createCourse,
} from "@/lib/services/course-service"
import { createCourseSchema } from "@/lib/validators/course"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")

    const courses = query
      ? await searchCourses(query)
      : await getAllPublishedCourses()

    return NextResponse.json({ courses })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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
    const parsed = createCourseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const course = await createCourse(parsed.data)
    return NextResponse.json({ course }, { status: 201 })
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
      { error: "Failed to create course" },
      { status: 500 }
    )
  }
}
