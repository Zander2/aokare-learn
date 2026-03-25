import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import {
  getProgressForCourse,
  markLessonComplete,
  markLessonIncomplete,
  checkAndCompleteCourse,
} from "@/lib/services/progress-service"
import { getLessonById } from "@/lib/services/lesson-service"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")
    if (!courseId) {
      return NextResponse.json(
        { error: "courseId query parameter is required" },
        { status: 400 }
      )
    }

    const progress = await getProgressForCourse(session.user.id, courseId)
    return NextResponse.json({ progress })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch progress" },
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

    const body: { lessonId?: string } = await request.json()
    if (!body.lessonId) {
      return NextResponse.json(
        { error: "lessonId is required" },
        { status: 400 }
      )
    }

    const progress = await markLessonComplete(session.user.id, body.lessonId)

    // Check if the course is now complete
    const lesson = await getLessonById(body.lessonId)
    if (lesson) {
      await checkAndCompleteCourse(session.user.id, lesson.module.course.id)
    }

    return NextResponse.json({ progress }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Failed to mark lesson complete" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const body: { lessonId?: string } = await request.json()
    if (!body.lessonId) {
      return NextResponse.json(
        { error: "lessonId is required" },
        { status: 400 }
      )
    }

    const progress = await markLessonIncomplete(
      session.user.id,
      body.lessonId
    )
    return NextResponse.json({ progress })
  } catch {
    return NextResponse.json(
      { error: "Failed to mark lesson incomplete" },
      { status: 500 }
    )
  }
}
