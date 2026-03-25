import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { getQuizById } from "@/lib/services/quiz-service"

type RouteParams = { params: { quizId: string } }

export async function GET(
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

    const quiz = await getQuizById(params.quizId)
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    }

    return NextResponse.json({ quiz })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch quiz" },
      { status: 500 }
    )
  }
}
