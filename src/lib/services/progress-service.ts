import { prisma } from "@/lib/prisma"
import { completeEnrollment } from "./enrollment-service"
import { issueCertificate } from "./certificate-service"

export async function markLessonComplete(userId: string, lessonId: string) {
  return prisma.progress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: { completed: true, completedAt: new Date() },
    create: { userId, lessonId, completed: true, completedAt: new Date() },
  })
}

export async function markLessonIncomplete(userId: string, lessonId: string) {
  return prisma.progress.update({
    where: { userId_lessonId: { userId, lessonId } },
    data: { completed: false, completedAt: null },
  })
}

export async function getProgressByUser(userId: string) {
  return prisma.progress.findMany({
    where: { userId },
    include: {
      lesson: {
        include: {
          module: {
            include: { course: true },
          },
        },
      },
    },
  })
}

export async function getProgressForCourse(userId: string, courseId: string) {
  return prisma.progress.findMany({
    where: {
      userId,
      lesson: {
        module: {
          courseId,
        },
      },
    },
    include: {
      lesson: true,
    },
  })
}

export async function getLessonCountsForCourse(
  userId: string,
  courseId: string
): Promise<{ totalLessons: number; completedLessons: number }> {
  const totalLessons = await prisma.lesson.count({
    where: { module: { courseId } },
  })

  const completedLessons = await prisma.progress.count({
    where: {
      userId,
      completed: true,
      lesson: { module: { courseId } },
    },
  })

  return { totalLessons, completedLessons }
}

export async function getCourseCompletionPercentage(
  userId: string,
  courseId: string
): Promise<number> {
  const totalLessons = await prisma.lesson.count({
    where: {
      module: { courseId },
    },
  })

  if (totalLessons === 0) return 0

  const completedLessons = await prisma.progress.count({
    where: {
      userId,
      completed: true,
      lesson: {
        module: { courseId },
      },
    },
  })

  return Math.round((completedLessons / totalLessons) * 100)
}

export async function checkAndCompleteCourse(
  userId: string,
  courseId: string
) {
  const percentage = await getCourseCompletionPercentage(userId, courseId)
  if (percentage === 100) {
    await completeEnrollment(userId, courseId)
    const existingCert = await prisma.certificate.findUnique({
      where: { userId_courseId: { userId, courseId } },
    })
    if (!existingCert) {
      await issueCertificate(userId, courseId)
    }
    return true
  }
  return false
}
