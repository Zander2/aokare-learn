import { notFound } from "next/navigation"
import { getCourseBySlug } from "@/lib/services/course-service"
import { isUserEnrolled } from "@/lib/services/enrollment-service"
import { getProgressForCourse } from "@/lib/services/progress-service"
import { getEnrollment } from "@/lib/services/enrollment-service"
import { auth } from "@/lib/auth"
import { ModuleAccordion } from "@/components/courses/module-accordion"
import { ProgressSidebar } from "@/components/courses/progress-sidebar"
import { CourseEnrollButton } from "@/components/courses/course-enroll-button"
import { EnrollmentToast } from "@/components/courses/enrollment-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { Module } from "@/types"

interface CourseDetailPageProps {
  params: Promise<{ slug: string }>
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { slug } = await params
  const course = await getCourseBySlug(slug)

  if (!course || course.status === "DRAFT") {
    notFound()
  }

  const session = await auth()
  const userId = session?.user?.id

  let enrolled = false
  let completedLessonIds: string[] = []
  let enrolledAt: string | null = null

  if (userId) {
    enrolled = await isUserEnrolled(userId, course.id)

    if (enrolled) {
      const progress = await getProgressForCourse(userId, course.id)
      completedLessonIds = progress
        .filter((p) => p.completed)
        .map((p) => p.lessonId)

      const enrollment = await getEnrollment(userId, course.id)
      enrolledAt = enrollment?.enrolledAt?.toISOString() ?? null
    }
  }

  const modules: Module[] = course.modules.map((mod) => ({
    id: mod.id,
    courseId: mod.courseId,
    title: mod.title,
    description: mod.description,
    order: mod.order,
    lessons: mod.lessons.map((les) => ({
      id: les.id,
      moduleId: les.moduleId,
      title: les.title,
      order: les.order,
      contentType: les.contentType as "TEXT" | "VIDEO" | "PDF" | "MIXED",
      contentBody: les.contentBody as { blocks: [] },
    })),
    quiz: mod.quiz
      ? {
          id: mod.quiz.id,
          moduleId: mod.quiz.moduleId,
          title: mod.quiz.title,
          description: mod.quiz.description,
          passingScore: mod.quiz.passingScore,
        }
      : null,
  }))

  const totalLessons = modules.reduce(
    (sum, m) => sum + (m.lessons?.length ?? 0),
    0
  )

  // Find the first incomplete lesson for "Continue Learning"
  let firstIncompleteLessonUrl: string | null = null
  for (const mod of modules) {
    for (const lesson of mod.lessons ?? []) {
      if (!completedLessonIds.includes(lesson.id)) {
        firstIncompleteLessonUrl = `/courses/${slug}/modules/${mod.id}/lessons/${lesson.id}`
        break
      }
    }
    if (firstIncompleteLessonUrl) break
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <EnrollmentToast />

      {/* Course header */}
      <div className="mb-10 border-b border-border pb-8">
        <div className="flex flex-wrap items-start gap-3 mb-3">
          <h1 className="text-3xl font-bold text-olive-deep leading-tight">
            {course.title}
          </h1>
          {enrolled && (
            <Badge variant="default" className="mt-1.5">Enrolled</Badge>
          )}
        </div>
        {course.description && (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-text-muted">
            {course.description}
          </p>
        )}
        <div className="mt-6">
          {enrolled ? (
            firstIncompleteLessonUrl ? (
              <Button
                className="bg-olive text-white hover:bg-olive-deep px-6 py-2.5 text-sm font-semibold"
                render={<Link href={firstIncompleteLessonUrl} />}
              >
                Continue Learning
              </Button>
            ) : (
              <Badge variant="default" className="px-4 py-1.5 text-sm">Course Completed</Badge>
            )
          ) : (
            <CourseEnrollButton courseId={course.id} isLoggedIn={!!userId} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-5 text-lg font-semibold text-olive-deep">
            Course Content
          </h2>
          <ModuleAccordion
            modules={modules}
            courseSlug={slug}
            completedLessonIds={completedLessonIds}
            isEnrolled={enrolled}
          />
        </div>

        <div>
          {enrolled && enrolledAt && (
            <ProgressSidebar
              completedLessons={completedLessonIds.length}
              totalLessons={totalLessons}
              enrolledAt={enrolledAt}
            />
          )}
        </div>
      </div>
    </div>
  )
}
