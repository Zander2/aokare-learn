import { prisma } from "@/lib/prisma"
import type { CreateQuizInput, UpdateQuizInput, QuestionInput } from "@/lib/validators/quiz"

export async function getQuizByModuleId(moduleId: string) {
  return prisma.quiz.findUnique({
    where: { moduleId },
    include: { questions: true },
  })
}

export async function getQuizById(id: string) {
  return prisma.quiz.findUnique({
    where: { id },
    include: { questions: true },
  })
}

export async function createQuiz(data: CreateQuizInput) {
  return prisma.quiz.create({
    data: {
      moduleId: data.moduleId,
      title: data.title,
      description: data.description,
      passingScore: data.passingScore,
    },
  })
}

export async function updateQuiz(id: string, data: UpdateQuizInput) {
  return prisma.quiz.update({
    where: { id },
    data,
  })
}

export async function deleteQuiz(id: string) {
  return prisma.quiz.delete({
    where: { id },
  })
}

export async function addQuestion(quizId: string, data: QuestionInput) {
  return prisma.question.create({
    data: {
      quizId,
      text: data.text,
      type: data.type,
      options: data.options,
      correctAnswer: data.correctAnswer,
      explanation: data.explanation,
    },
  })
}

export async function updateQuestion(id: string, data: Partial<QuestionInput>) {
  return prisma.question.update({
    where: { id },
    data,
  })
}

export async function deleteQuestion(id: string) {
  return prisma.question.delete({
    where: { id },
  })
}
