import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import {
  enrollUser,
  getEnrollmentsByUser,
} from "@/lib/services/enrollment-service"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const enrollments = await getEnrollmentsByUser(session.user.id)
    return NextResponse.json({ enrollments })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch enrollments" },
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

    const body: { courseId?: string } = await request.json()
    if (!body.courseId) {
      return NextResponse.json(
        { error: "courseId is required" },
        { status: 400 }
      )
    }

    const enrollment = await enrollUser(session.user.id, body.courseId)
    return NextResponse.json({ enrollment }, { status: 201 })
  } catch (err) {
    if (
      err instanceof Error &&
      err.message === "User is already enrolled in this course"
    ) {
      return NextResponse.json(
        { error: "Already enrolled in this course" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Failed to enroll" }, { status: 500 })
  }
}
