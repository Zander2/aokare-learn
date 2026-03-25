import { prisma } from "@/lib/prisma"
import type { CreateCourseInput, UpdateCourseInput } from "@/lib/validators/course"

export async function getAllPublishedCourses() {
  return prisma.course.findMany({
    where: { status: "PUBLISHED" },
    include: {
      _count: {
        select: { modules: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getAllCourses() {
  return prisma.course.findMany({
    include: {
      _count: {
        select: { modules: true, enrollments: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getCourseBySlug(slug: string) {
  return prisma.course.findUnique({
    where: { slug },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
          },
          quiz: { include: { questions: true } },
        },
      },
    },
  })
}

export async function getCourseById(id: string) {
  return prisma.course.findUnique({
    where: { id },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
          },
          quiz: { include: { questions: true } },
        },
      },
    },
  })
}

export async function createCourse(data: CreateCourseInput) {
  const existing = await prisma.course.findUnique({
    where: { slug: data.slug },
  })
  if (existing) {
    throw new Error("A course with this slug already exists")
  }
  return prisma.course.create({
    data: {
      title: data.title,
      slug: data.slug,
      description: data.description,
      status: data.status,
    },
  })
}

export async function updateCourse(id: string, data: UpdateCourseInput) {
  if (data.slug) {
    const existing = await prisma.course.findFirst({
      where: { slug: data.slug, NOT: { id } },
    })
    if (existing) {
      throw new Error("A course with this slug already exists")
    }
  }
  return prisma.course.update({
    where: { id },
    data,
  })
}

export async function deleteCourse(id: string) {
  return prisma.course.delete({
    where: { id },
  })
}

export async function searchCourses(query: string) {
  return prisma.course.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    },
    include: {
      _count: {
        select: { modules: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}
