import { notFound } from "next/navigation"
import { getCourseById } from "@/lib/services/course-service"
import { AdminCourseEditorClient } from "@/components/admin/admin-course-editor-client"
import type { Module, Question } from "@/types"

interface AdminCourseEditorPageProps {
  params: Promise<{ courseId: string }>
}

export default async function AdminCourseEditorPage({ params }: AdminCourseEditorPageProps) {
  const { courseId } = await params
  const isNew = courseId === "new"

  if (isNew) {
    return (
      <AdminCourseEditorClient
        isNew
        courseId={null}
        initialTitle=""
        initialSlug=""
        initialDescription=""
        initialStatus="DRAFT"
        initialModules={[]}
      />
    )
  }

  const course = await getCourseById(courseId)
  if (!course) {
    notFound()
  }

  const modules: (Module & { quiz?: { id: string; moduleId: string; title: string; description: string | null; passingScore: number; questions?: Question[] } | null })[] = course.modules.map((mod) => ({
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
          questions: (mod.quiz as { questions?: Array<{ id: string; quizId: string; text: string; type: string; options: unknown; correctAnswer: string; explanation: string | null }> }).questions?.map((q) => ({
            id: q.id,
            quizId: q.quizId,
            text: q.text,
            type: q.type as "MCQ" | "TRUEFALSE",
            options: q.options as string[],
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
          })) ?? [],
        }
      : null,
  }))

  return (
    <AdminCourseEditorClient
      isNew={false}
      courseId={course.id}
      initialTitle={course.title}
      initialSlug={course.slug}
      initialDescription={course.description ?? ""}
      initialStatus={course.status as "DRAFT" | "PUBLISHED"}
      initialModules={modules}
    />
  )
}
