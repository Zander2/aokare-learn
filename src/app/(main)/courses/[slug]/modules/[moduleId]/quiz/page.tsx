import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { getQuizByModuleId } from "@/lib/services/quiz-service"
import { getModuleById } from "@/lib/services/module-service"
import { isUserEnrolled } from "@/lib/services/enrollment-service"
import { QuizPlayerWrapper } from "@/components/quizzes/quiz-player-wrapper"
import { ChevronRight } from "lucide-react"
import type { Question } from "@/types"

interface QuizPageProps {
  params: Promise<{ slug: string; moduleId: string }>
}

export default async function QuizPage({ params }: QuizPageProps) {
  const { slug, moduleId } = await params

  const session = await auth()
  if (!session?.user) {
    redirect(`/login?callbackUrl=/courses/${slug}/modules/${moduleId}/quiz`)
  }

  const mod = await getModuleById(moduleId)
  if (!mod) {
    notFound()
  }

  const enrolled = await isUserEnrolled(session.user.id, mod.courseId)
  if (!enrolled) {
    redirect(`/courses/${slug}?error=enrollment_required`)
  }

  const quiz = await getQuizByModuleId(moduleId)
  if (!quiz || quiz.questions.length === 0) {
    notFound()
  }

  const questions: Question[] = quiz.questions.map((q) => ({
    id: q.id,
    quizId: q.quizId,
    text: q.text,
    type: q.type as "MCQ" | "TRUEFALSE",
    options: q.options as string[],
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
  }))

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-text-muted">
        <Link href={`/courses/${slug}`} className="hover:text-olive">
          Course
        </Link>
        <ChevronRight className="size-3" />
        <span>{mod.title}</span>
        <ChevronRight className="size-3" />
        <span className="text-text-primary">{quiz.title}</span>
      </nav>

      <QuizPlayerWrapper
        quizId={quiz.id}
        quiz={{
          title: quiz.title,
          passingScore: quiz.passingScore,
          questions,
        }}
        courseSlug={slug}
      />
    </div>
  )
}
