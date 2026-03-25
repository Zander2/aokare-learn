"use server"

import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import {
  createQuizSchema,
  updateQuizSchema,
  questionSchema,
  submitQuizSchema,
} from "@/lib/validators/quiz"
import {
  createQuiz,
  updateQuiz,
  addQuestion,
  updateQuestion,
  deleteQuestion,
} from "@/lib/services/quiz-service"
import { submitQuizAttempt } from "@/lib/services/quiz-attempt-service"
import type { Quiz, Question, QuizAttempt } from "@prisma/client"

type ActionResult<T = null> = {
  success: boolean
  error?: string
  data?: T
}

export async function createQuizAction(
  formData: FormData
): Promise<ActionResult<Quiz>> {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "Admin access required" }
  }

  const raw = {
    moduleId: formData.get("moduleId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    passingScore: Number(formData.get("passingScore") ?? 70),
  }

  const parsed = createQuizSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    }
  }

  try {
    const quiz = await createQuiz(parsed.data)
    revalidatePath("/admin/courses")
    return { success: true, data: quiz }
  } catch {
    return { success: false, error: "Failed to create quiz" }
  }
}

export async function updateQuizAction(
  quizId: string,
  formData: FormData
): Promise<ActionResult<Quiz>> {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "Admin access required" }
  }

  const raw = {
    title: formData.get("title") || undefined,
    description: formData.get("description") || undefined,
    passingScore: formData.get("passingScore")
      ? Number(formData.get("passingScore"))
      : undefined,
  }

  const parsed = updateQuizSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    }
  }

  try {
    const quiz = await updateQuiz(quizId, parsed.data)
    revalidatePath("/admin/courses")
    return { success: true, data: quiz }
  } catch {
    return { success: false, error: "Failed to update quiz" }
  }
}

export async function addQuestionAction(
  formData: FormData
): Promise<ActionResult<Question>> {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "Admin access required" }
  }

  const quizId = formData.get("quizId") as string | null
  if (!quizId) {
    return { success: false, error: "Quiz ID is required" }
  }

  const optionsRaw = formData.get("options")
  let options: unknown = []
  if (typeof optionsRaw === "string") {
    try {
      options = JSON.parse(optionsRaw)
    } catch {
      return { success: false, error: "Invalid options JSON" }
    }
  }

  const raw = {
    text: formData.get("text"),
    type: formData.get("type"),
    options,
    correctAnswer: formData.get("correctAnswer"),
    explanation: formData.get("explanation") || undefined,
  }

  const parsed = questionSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    }
  }

  try {
    const question = await addQuestion(quizId, parsed.data)
    revalidatePath("/admin/courses")
    return { success: true, data: question }
  } catch {
    return { success: false, error: "Failed to add question" }
  }
}

export async function updateQuestionAction(
  questionId: string,
  formData: FormData
): Promise<ActionResult<Question>> {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "Admin access required" }
  }

  const optionsRaw = formData.get("options")
  let options: unknown | undefined
  if (typeof optionsRaw === "string") {
    try {
      options = JSON.parse(optionsRaw)
    } catch {
      return { success: false, error: "Invalid options JSON" }
    }
  }

  const raw = {
    text: formData.get("text") || undefined,
    type: formData.get("type") || undefined,
    options,
    correctAnswer: formData.get("correctAnswer") || undefined,
    explanation: formData.get("explanation") || undefined,
  }

  const parsed = questionSchema.partial().safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    }
  }

  try {
    const question = await updateQuestion(questionId, parsed.data)
    revalidatePath("/admin/courses")
    return { success: true, data: question }
  } catch {
    return { success: false, error: "Failed to update question" }
  }
}

export async function deleteQuestionAction(
  questionId: string
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "Admin access required" }
  }

  try {
    await deleteQuestion(questionId)
    revalidatePath("/admin/courses")
    return { success: true }
  } catch {
    return { success: false, error: "Failed to delete question" }
  }
}

export async function submitQuizAction(
  formData: FormData
): Promise<ActionResult<QuizAttempt>> {
  const session = await auth()
  if (!session?.user) {
    return { success: false, error: "Authentication required" }
  }

  const quizId = formData.get("quizId") as string | null
  const answersRaw = formData.get("answers")

  let answers: Record<string, string> = {}
  if (typeof answersRaw === "string") {
    try {
      answers = JSON.parse(answersRaw) as Record<string, string>
    } catch {
      return { success: false, error: "Invalid answers JSON" }
    }
  }

  const parsed = submitQuizSchema.safeParse({ quizId, answers })
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    }
  }

  try {
    const attempt = await submitQuizAttempt(
      session.user.id,
      parsed.data.quizId,
      parsed.data.answers
    )
    revalidatePath("/dashboard")
    return { success: true, data: attempt }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to submit quiz"
    return { success: false, error: message }
  }
}
