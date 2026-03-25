"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { Question } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { submitQuizAction } from "@/lib/actions/quiz-actions"
import { toast } from "sonner"
import Link from "next/link"

interface QuizPlayerWrapperProps {
  quizId: string
  quiz: {
    title: string
    passingScore: number
    questions: Question[]
  }
  courseSlug: string
}

interface QuizResult {
  score: number
  passed: boolean
}

export function QuizPlayerWrapper({ quizId, quiz, courseSlug }: QuizPlayerWrapperProps) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<QuizResult | null>(null)
  const [isPending, startTransition] = useTransition()

  const question = quiz.questions[currentIndex]
  const totalQuestions = quiz.questions.length
  const progressPct = Math.round(((currentIndex + 1) / totalQuestions) * 100)
  const isLast = currentIndex === totalQuestions - 1

  function handleAnswer(value: string) {
    if (result) return
    setAnswers((prev) => ({ ...prev, [question.id]: value }))
  }

  function handleNext() {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  function handleSubmit() {
    startTransition(async () => {
      const formData = new FormData()
      formData.set("quizId", quizId)
      formData.set("answers", JSON.stringify(answers))

      const response = await submitQuizAction(formData)

      if (response.success && response.data) {
        const score = response.data.score
        const passed = response.data.passed
        setResult({ score, passed })
        toast.success(`Quiz submitted! Score: ${score}%`)
        router.refresh()
      } else {
        toast.error(response.error ?? "Failed to submit quiz")
      }
    })
  }

  if (result) {
    const correctCount = quiz.questions.filter(
      (q) => answers[q.id] === q.correctAnswer
    ).length

    return (
      <Card className="mx-auto max-w-2xl">
        <CardHeader className="items-center">
          <CardTitle className="text-olive-deep">Quiz Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-3">
            <span className="text-4xl font-semibold text-olive-deep">
              {result.score}%
            </span>
            <Badge variant={result.passed ? "default" : "destructive"}>
              {result.passed ? "Passed" : "Not Passed"}
            </Badge>
            <p className="text-sm text-text-muted">
              {correctCount} of {totalQuestions} correct (passing:{" "}
              {quiz.passingScore}%)
            </p>
          </div>

          <div className="space-y-4">
            {quiz.questions.map((q, i) => {
              const userAnswer = answers[q.id]
              const isCorrect = userAnswer === q.correctAnswer
              return (
                <div
                  key={q.id}
                  className="rounded border border-border p-4"
                >
                  <div className="mb-2 flex items-start gap-2">
                    {isCorrect ? (
                      <CheckCircle2 className="mt-0.5 size-4 text-olive" />
                    ) : (
                      <XCircle className="mt-0.5 size-4 text-red-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {i + 1}. {q.text}
                      </p>
                      {!isCorrect && (
                        <div className="mt-1 space-y-0.5 text-xs">
                          <p className="text-red-500">
                            Your answer: {userAnswer ?? "No answer"}
                          </p>
                          <p className="text-olive">
                            Correct answer: {q.correctAnswer}
                          </p>
                          {q.explanation && (
                            <p className="mt-1 text-text-muted">
                              {q.explanation}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex justify-center">
            <Button render={<Link href={`/courses/${courseSlug}`} />}>
              Back to Course
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle className="text-olive-deep">{quiz.title}</CardTitle>
        <div className="mt-2">
          <Progress value={progressPct} />
          <p className="mt-1 text-xs text-text-muted">
            Question {currentIndex + 1} of {totalQuestions}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm font-medium text-text-primary">{question.text}</p>

        {question.type === "TRUEFALSE" ? (
          <div className="flex gap-3">
            <Button
              variant={answers[question.id] === "True" ? "default" : "outline"}
              className="flex-1"
              onClick={() => handleAnswer("True")}
            >
              True
            </Button>
            <Button
              variant={answers[question.id] === "False" ? "default" : "outline"}
              className="flex-1"
              onClick={() => handleAnswer("False")}
            >
              False
            </Button>
          </div>
        ) : (
          <RadioGroup
            value={answers[question.id] ?? ""}
            onValueChange={handleAnswer}
          >
            {question.options.map((option, i) => (
              <div key={i} className="flex items-center gap-2">
                <RadioGroupItem value={option} id={`option-${i}`} />
                <Label htmlFor={`option-${i}`} className="cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        <div className="flex justify-end">
          {isLast ? (
            <Button
              onClick={handleSubmit}
              disabled={!answers[question.id] || isPending}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Submit Quiz
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!answers[question.id]}
            >
              Next
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
