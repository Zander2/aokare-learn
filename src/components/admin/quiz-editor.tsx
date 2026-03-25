"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { Question } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Loader2, Save } from "lucide-react"
import {
  addQuestionAction,
  updateQuestionAction,
  deleteQuestionAction,
  updateQuizAction,
} from "@/lib/actions/quiz-actions"
import { toast } from "sonner"

interface QuizEditorProps {
  quizId: string
  questions: Question[]
  passingScore: number
  onQuestionsChange: (questions: Question[]) => void
  onPassingScoreChange: (score: number) => void
}

export function QuizEditor({
  quizId,
  questions,
  passingScore,
  onQuestionsChange,
  onPassingScoreChange,
}: QuizEditorProps) {
  const router = useRouter()
  const [localPassingScore, setLocalPassingScore] = useState(passingScore)
  const [isSavingScore, startSaveScore] = useTransition()
  const [isAddingQuestion, startAddQuestion] = useTransition()
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null)
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null)

  // Local state for editing questions
  const [editedQuestions, setEditedQuestions] = useState<Record<string, {
    text: string
    type: "MCQ" | "TRUEFALSE"
    options: string[]
    correctAnswer: string
    explanation: string
  }>>({})

  function getQuestionEdit(q: Question) {
    return editedQuestions[q.id] ?? {
      text: q.text,
      type: q.type,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation ?? "",
    }
  }

  function updateQuestionEdit(questionId: string, field: string, value: string | string[]) {
    setEditedQuestions((prev) => ({
      ...prev,
      [questionId]: {
        ...getQuestionEdit(questions.find((q) => q.id === questionId)!),
        [field]: value,
      },
    }))
  }

  function handleSavePassingScore() {
    startSaveScore(async () => {
      const formData = new FormData()
      formData.set("passingScore", String(localPassingScore))
      const result = await updateQuizAction(quizId, formData)
      if (result.success) {
        toast.success("Passing score updated!")
        onPassingScoreChange(localPassingScore)
      } else {
        toast.error(result.error ?? "Failed to update passing score")
      }
    })
  }

  function handleAddQuestion() {
    startAddQuestion(async () => {
      const formData = new FormData()
      formData.set("quizId", quizId)
      formData.set("text", "New question")
      formData.set("type", "MCQ")
      formData.set("options", JSON.stringify(["Option A", "Option B", "Option C", "Option D"]))
      formData.set("correctAnswer", "Option A")

      const result = await addQuestionAction(formData)
      if (result.success) {
        toast.success("Question added!")
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed to add question")
      }
    })
  }

  function handleSaveQuestion(questionId: string) {
    const q = questions.find((q) => q.id === questionId)
    if (!q) return
    const edited = getQuestionEdit(q)

    setSavingQuestionId(questionId)
    const formData = new FormData()
    formData.set("text", edited.text)
    formData.set("type", edited.type)
    formData.set("options", JSON.stringify(edited.options))
    formData.set("correctAnswer", edited.correctAnswer)
    formData.set("explanation", edited.explanation)

    updateQuestionAction(questionId, formData).then((result) => {
      setSavingQuestionId(null)
      if (result.success) {
        toast.success("Question saved!")
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed to save question")
      }
    })
  }

  function handleDeleteQuestion(questionId: string) {
    if (!confirm("Delete this question?")) return
    setDeletingQuestionId(questionId)

    deleteQuestionAction(questionId).then((result) => {
      setDeletingQuestionId(null)
      if (result.success) {
        toast.success("Question deleted")
        onQuestionsChange(questions.filter((q) => q.id !== questionId))
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed to delete question")
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="passing-score">Passing Score (%)</Label>
          <Input
            id="passing-score"
            type="number"
            min={0}
            max={100}
            value={localPassingScore}
            onChange={(e) => setLocalPassingScore(Number(e.target.value))}
            className="w-24"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSavePassingScore}
          disabled={isSavingScore}
        >
          {isSavingScore ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
          Save
        </Button>
      </div>

      {questions.map((q, index) => {
        const edited = getQuestionEdit(q)
        return (
          <Card key={q.id}>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Question {index + 1}</CardTitle>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleSaveQuestion(q.id)}
                  disabled={savingQuestionId === q.id}
                >
                  {savingQuestionId === q.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4 text-olive" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDeleteQuestion(q.id)}
                  disabled={deletingQuestionId === q.id}
                >
                  {deletingQuestionId === q.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4 text-red-500" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Question text..."
                value={edited.text}
                onChange={(e) => updateQuestionEdit(q.id, "text", e.target.value)}
                rows={2}
              />

              <div className="flex items-center gap-3">
                <Label className="text-xs">Type:</Label>
                <Select
                  value={edited.type}
                  onValueChange={(val) => {
                    if (val) updateQuestionEdit(q.id, "type", val)
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MCQ">Multiple Choice</SelectItem>
                    <SelectItem value="TRUEFALSE">True / False</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {edited.type === "MCQ" && (
                <div className="space-y-2">
                  <Label className="text-xs">Options:</Label>
                  {edited.options.map((opt, oi) => (
                    <Input
                      key={oi}
                      value={opt}
                      onChange={(e) => {
                        const newOptions = [...edited.options]
                        newOptions[oi] = e.target.value
                        updateQuestionEdit(q.id, "options", newOptions)
                      }}
                      placeholder={`Option ${oi + 1}`}
                    />
                  ))}
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Correct Answer:</Label>
                <Input
                  value={edited.correctAnswer}
                  onChange={(e) => updateQuestionEdit(q.id, "correctAnswer", e.target.value)}
                  placeholder="Correct answer"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Explanation (optional):</Label>
                <Input
                  value={edited.explanation}
                  onChange={(e) => updateQuestionEdit(q.id, "explanation", e.target.value)}
                  placeholder="Explanation for wrong answers"
                />
              </div>
            </CardContent>
          </Card>
        )
      })}

      <Button
        variant="outline"
        onClick={handleAddQuestion}
        disabled={isAddingQuestion}
      >
        {isAddingQuestion ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        Add Question
      </Button>
    </div>
  )
}
