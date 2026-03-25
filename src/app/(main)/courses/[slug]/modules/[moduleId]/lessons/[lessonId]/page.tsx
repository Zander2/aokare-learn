import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { getLessonById, getLessonsByModule } from "@/lib/services/lesson-service"
import { isUserEnrolled } from "@/lib/services/enrollment-service"
import { getProgressForCourse } from "@/lib/services/progress-service"
import { getCourseBySlug } from "@/lib/services/course-service"
import { ContentRenderer } from "@/components/lessons/content-renderer"
import { LessonNavigation } from "@/components/lessons/lesson-navigation"
import { MarkCompleteButton } from "@/components/lessons/mark-complete-button"
import { ChevronRight, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ContentBlock } from "@/types"

interface LessonPageProps {
  params: Promise<{ slug: string; moduleId: string; lessonId: string }>
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { slug, moduleId, lessonId } = await params

  const session = await auth()
  if (!session?.user) {
    redirect(`/login?callbackUrl=/courses/${slug}/modules/${moduleId}/lessons/${lessonId}`)
  }

  const lesson = await getLessonById(lessonId)
  if (!lesson) {
    notFound()
  }

  const courseId = lesson.module.course.id
  const enrolled = await isUserEnrolled(session.user.id, courseId)
  if (!enrolled) {
    redirect(`/courses/${slug}?error=enrollment_required`)
  }

  // Get all lessons in this module for the sidebar
  const moduleLessons = await getLessonsByModule(moduleId)

  // Fetch the full course to build a flattened ordered lesson list for cross-module navigation
  const course = await getCourseBySlug(slug)
  const allLessons = course
    ? course.modules
        .slice()
        .sort((a, b) => a.order - b.order)
        .flatMap((mod) =>
          mod.lessons.slice().sort((a, b) => a.order - b.order).map((l) => ({
            ...l,
            moduleId: mod.id,
          }))
        )
    : []

  // Get progress for the course
  const progressRecords = await getProgressForCourse(session.user.id, courseId)
  const completedLessonIds = new Set(
    progressRecords.filter((p) => p.completed).map((p) => p.lessonId)
  )

  const isCompleted = completedLessonIds.has(lessonId)

  // Calculate prev/next lessons across all modules
  const currentIndex = allLessons.findIndex((l) => l.id === lessonId)
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null
  const nextLesson =
    currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null

  const contentBody = lesson.contentBody as { blocks?: ContentBlock[] } | null
  const blocks: ContentBlock[] = contentBody?.blocks ?? []

  const courseName = lesson.module.course.title
  const moduleName = lesson.module.title

  // Figure out module number and lesson position within module
  const moduleOrder = lesson.module.order
  const currentLessonIndexInModule = moduleLessons.findIndex((l) => l.id === lessonId)
  const lessonNumberInModule = currentLessonIndexInModule + 1
  const totalLessonsInModule = moduleLessons.length
  const progressPercent = totalLessonsInModule > 0
    ? Math.round((lessonNumberInModule / totalLessonsInModule) * 100)
    : 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Top progress bar */}
      <div className="mb-6 h-[3px] w-full rounded-full bg-border overflow-hidden">
        <div
          className="h-full bg-olive rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-xs text-text-muted">
        <Link href={`/courses/${slug}`} className="font-medium text-olive hover:text-olive-deep transition-colors">
          {courseName}
        </Link>
        <ChevronRight className="size-3" />
        <span>{moduleName}</span>
        <ChevronRight className="size-3" />
        <span className="text-text-primary">{lesson.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Main content */}
        <div className="lg:col-span-3">
          {/* Lesson header */}
          <div className="mb-6">
            {/* Pill badge */}
            <div className="mb-3 inline-flex items-center rounded-full border border-border bg-olive/[0.06] px-3 py-1">
              <span className="text-xs font-medium text-olive-deep">
                Module {moduleOrder} &middot; Lesson {lessonNumberInModule} of {totalLessonsInModule}
              </span>
            </div>
            {/* Title */}
            <h1 className="text-2xl font-semibold text-olive-deep leading-tight">
              {lesson.title}
            </h1>
            {/* Separator */}
            <div className="mt-5 h-px w-full bg-border" />
          </div>

          {/* Content area: max 720px centered */}
          <div className="max-w-[720px]">
            <ContentRenderer blocks={blocks} />

            {/* Mark as complete */}
            <div className="mt-10 pt-6 border-t border-border">
              <MarkCompleteButton
                lessonId={lessonId}
                isCompleted={isCompleted}
              />
            </div>

            {/* Navigation */}
            <div className="mt-6">
              <LessonNavigation
                prevLesson={
                  prevLesson
                    ? {
                        slug: `/courses/${slug}/modules/${prevLesson.moduleId}/lessons/${prevLesson.id}`,
                        title: prevLesson.title,
                      }
                    : null
                }
                nextLesson={
                  nextLesson
                    ? {
                        slug: `/courses/${slug}/modules/${nextLesson.moduleId}/lessons/${nextLesson.id}`,
                        title: nextLesson.title,
                      }
                    : null
                }
              />
            </div>
          </div>
        </div>

        {/* Sidebar stepper */}
        <aside className="lg:col-span-1">
          <div className="sticky top-20 rounded-lg border border-border p-4">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Module {moduleOrder}
            </h3>
            <h4 className="mb-4 text-sm font-semibold text-olive-deep leading-snug">{moduleName}</h4>
            <div className="relative">
              {/* Vertical connector line */}
              <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />
              <ul className="space-y-0">
                {moduleLessons.map((sideLesson) => {
                  const isCurrent = sideLesson.id === lessonId
                  const isComplete = completedLessonIds.has(sideLesson.id)
                  return (
                    <li key={sideLesson.id}>
                      <Link
                        href={`/courses/${slug}/modules/${moduleId}/lessons/${sideLesson.id}`}
                        className="group relative flex items-start gap-3 py-2 pl-0"
                      >
                        {/* Dot / checkmark */}
                        <div
                          className={cn(
                            "relative z-10 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2",
                            isCurrent
                              ? "border-olive bg-olive"
                              : isComplete
                              ? "border-olive bg-olive"
                              : "border-border bg-stone-white"
                          )}
                        >
                          {isComplete && (
                            <CheckCircle2 className="size-3 text-white" />
                          )}
                          {isCurrent && !isComplete && (
                            <div className="size-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        {/* Label */}
                        <span
                          className={cn(
                            "text-sm leading-tight",
                            isCurrent
                              ? "font-medium text-olive-deep"
                              : isComplete
                              ? "text-text-muted line-through decoration-border"
                              : "text-text-primary group-hover:text-olive"
                          )}
                        >
                          {sideLesson.title}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
