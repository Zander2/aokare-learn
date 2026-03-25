import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { submitQuizAttempt } from "@/lib/services/quiz-attempt-service"
import { submitQuizSchema } from "@/lib/validators/quiz"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = submitQuizSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const attempt = await submitQuizAttempt(
      session.user.id,
      parsed.data.quizId,
      parsed.data.answers
    )

    return NextResponse.json({ attempt }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === "Quiz not found") {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    }
    if (err instanceof Error && err.message === "Quiz has no questions") {
      return NextResponse.json(
        { error: "Quiz has no questions" },
        { status: 422 }
      )
    }
    return NextResponse.json({ error: "Failed to submit quiz" }, { status: 500 })
  }
}
