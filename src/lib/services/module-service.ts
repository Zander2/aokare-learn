import { prisma } from "@/lib/prisma"
import type { CreateModuleInput, UpdateModuleInput } from "@/lib/validators/module"

export async function getModulesByCourse(courseId: string) {
  return prisma.module.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    include: {
      lessons: { orderBy: { order: "asc" } },
      quiz: true,
    },
  })
}

export async function getModuleById(id: string) {
  return prisma.module.findUnique({
    where: { id },
    include: {
      lessons: { orderBy: { order: "asc" } },
      quiz: { include: { questions: true } },
    },
  })
}

export async function createModule(data: CreateModuleInput) {
  return prisma.module.create({
    data: {
      courseId: data.courseId,
      title: data.title,
      description: data.description,
      order: data.order,
    },
  })
}

export async function updateModule(id: string, data: UpdateModuleInput) {
  return prisma.module.update({
    where: { id },
    data,
  })
}

export async function deleteModule(id: string) {
  return prisma.module.delete({
    where: { id },
  })
}

export async function reorderModules(courseId: string, moduleIds: string[]) {
  const updates = moduleIds.map((id, index) =>
    prisma.module.update({
      where: { id },
      data: { order: index },
    })
  )
  return prisma.$transaction(updates)
}
