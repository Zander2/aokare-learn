import { prisma } from "@/lib/prisma"

export async function enrollUser(userId: string, courseId: string) {
  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  })
  if (existing) {
    throw new Error("User is already enrolled in this course")
  }
  return prisma.enrollment.create({
    data: { userId, courseId },
  })
}

export async function getEnrollmentsByUser(userId: string) {
  return prisma.enrollment.findMany({
    where: { userId },
    include: {
      course: {
        include: {
          _count: {
            select: { modules: true },
          },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  })
}

export async function getEnrollment(userId: string, courseId: string) {
  return prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  })
}

export async function isUserEnrolled(
  userId: string,
  courseId: string
): Promise<boolean> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  })
  return enrollment !== null
}

export async function completeEnrollment(userId: string, courseId: string) {
  return prisma.enrollment.update({
    where: { userId_courseId: { userId, courseId } },
    data: { completedAt: new Date() },
  })
}

export async function deleteEnrollment(userId: string, courseId: string) {
  return prisma.enrollment.delete({
    where: { userId_courseId: { userId, courseId } },
  })
}
