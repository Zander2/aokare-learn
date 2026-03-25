export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getEnrollmentsByUser } from "@/lib/services/enrollment-service"
import { getCourseCompletionPercentage, getLessonCountsForCourse } from "@/lib/services/progress-service"
import { getCertificatesByUser } from "@/lib/services/certificate-service"
import { DashboardClient } from "@/components/dashboard/dashboard-client"

interface EnrolledCourseData {
  title: string
  slug: string
  progress: number
  totalLessons: number
  completedLessons: number
}

interface CertificateData {
  courseTitle: string
  issuedAt: string
  certificateUrl: string | null
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard")
  }

  const userId = session.user.id

  const enrollments = await getEnrollmentsByUser(userId)
  const certificates = await getCertificatesByUser(userId)

  // Calculate progress for each enrolled course
  const enrichedEnrollments: EnrolledCourseData[] = await Promise.all(
    enrollments.map(async (enrollment) => {
      const progress = await getCourseCompletionPercentage(
        userId,
        enrollment.courseId
      )

      const { totalLessons, completedLessons } = await getLessonCountsForCourse(
        userId,
        enrollment.courseId
      )

      return {
        title: enrollment.course.title,
        slug: enrollment.course.slug,
        progress,
        totalLessons,
        completedLessons,
      }
    })
  )

  const inProgressCourses = enrichedEnrollments.filter((c) => c.progress < 100)
  const completedCourses = enrichedEnrollments.filter((c) => c.progress === 100)

  const certificateData: CertificateData[] = certificates.map((cert) => ({
    courseTitle: cert.course.title,
    issuedAt: cert.issuedAt.toISOString(),
    certificateUrl: cert.certificateUrl,
  }))

  return (
    <DashboardClient
      inProgressCourses={inProgressCourses}
      completedCourses={completedCourses}
      certificates={certificateData}
    />
  )
}
