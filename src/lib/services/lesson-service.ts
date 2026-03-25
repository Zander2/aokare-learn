import { prisma } from "@/lib/prisma"
import type { CreateLessonInput, UpdateLessonInput } from "@/lib/validators/lesson"

export async function getLessonById(id: string) {
  return prisma.lesson.findUnique({
    where: { id },
    include: {
      module: {
        include: {
          course: true,
        },
      },
    },
  })
}

export async function getLessonsByModule(moduleId: string) {
  return prisma.lesson.findMany({
    where: { moduleId },
    orderBy: { order: "asc" },
  })
}

export async function createLesson(data: CreateLessonInput) {
  return prisma.lesson.create({
    data: {
      moduleId: data.moduleId,
      title: data.title,
      order: data.order,
      contentType: data.contentType,
      contentBody: data.contentBody,
    },
  })
}

export async function updateLesson(id: string, data: UpdateLessonInput) {
  return prisma.lesson.update({
    where: { id },
    data,
  })
}

export async function deleteLesson(id: string) {
  return prisma.lesson.delete({
    where: { id },
  })
}
