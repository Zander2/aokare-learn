import { prisma } from "@/lib/prisma"
import { getQuizById } from "./quiz-service"

export async function submitQuizAttempt(
  userId: string,
  quizId: string,
  answers: Record<string, string>
) {
  const quiz = await getQuizById(quizId)
  if (!quiz) {
    throw new Error("Quiz not found")
  }

  const totalQuestions = quiz.questions.length
  if (totalQuestions === 0) {
    throw new Error("Quiz has no questions")
  }

  let correctCount = 0
  for (const question of quiz.questions) {
    const userAnswer = answers[question.id]
    if (userAnswer === question.correctAnswer) {
      correctCount++
    }
  }

  const score = Math.round((correctCount / totalQuestions) * 100)
  const passed = score >= quiz.passingScore

  return prisma.quizAttempt.create({
    data: {
      userId,
      quizId,
      score,
      passed,
      answers,
    },
    include: {
      quiz: {
        select: { title: true, passingScore: true },
      },
    },
  })
}

export async function getAttemptsByUser(userId: string) {
  return prisma.quizAttempt.findMany({
    where: { userId },
    include: {
      quiz: {
        select: { title: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getAttemptsByQuiz(quizId: string) {
  return prisma.quizAttempt.findMany({
    where: { quizId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getBestAttempt(userId: string, quizId: string) {
  return prisma.quizAttempt.findFirst({
    where: { userId, quizId },
    orderBy: { score: "desc" },
    include: {
      quiz: {
        select: { title: true, passingScore: true },
      },
    },
  })
}
