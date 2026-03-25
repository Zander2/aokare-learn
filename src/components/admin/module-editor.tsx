"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { Module } from "@/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { LessonEditor } from "@/components/admin/lesson-editor"
import { QuizEditor } from "@/components/admin/quiz-editor"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import { GripVertical, Plus, Pencil, Trash2, Loader2, Save } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { updateModuleAction, deleteModuleAction } from "@/lib/actions/module-actions"
import { createLessonAction, updateLessonAction, deleteLessonAction } from "@/lib/actions/lesson-actions"
import { createQuizAction } from "@/lib/actions/quiz-actions"
import { toast } from "sonner"

interface ModuleEditorProps {
  module: Module
  index: number
}

export function ModuleEditor({ module, index }: ModuleEditorProps) {
  const router = useRouter()
  const [lessonEditorOpen, setLessonEditorOpen] = useState(false)
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
  const [editingLesson, setEditingLesson] = useState<{
    title: string
    contentType: "TEXT" | "VIDEO" | "PDF" | "MIXED"
    contentBody: string
  }>({
    title: "",
    contentType: "TEXT",
    contentBody: '{"blocks": []}',
  })
  const [moduleTitle, setModuleTitle] = useState(module.title)
  const [moduleDescription, setModuleDescription] = useState(module.description ?? "")
  const [isSaving, startSave] = useTransition()
  const [isDeleting, startDelete] = useTransition()
  const [isAddingLesson, startAddLesson] = useTransition()
  const [isDeletingLesson, startDeleteLesson] = useTransition()
  const [isAddingQuiz, startAddQuiz] = useTransition()

  function handleSaveModule() {
    startSave(async () => {
      const formData = new FormData()
      formData.set("title", moduleTitle)
      formData.set("description", moduleDescription)
      const result = await updateModuleAction(module.id, formData)
      if (result.success) {
        toast.success("Module saved!")
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed to save module")
      }
    })
  }

  function handleDeleteModule() {
    if (!confirm("Delete this module and all its lessons?")) return
    startDelete(async () => {
      const result = await deleteModuleAction(module.id)
      if (result.success) {
        toast.success("Module deleted")
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed to delete module")
      }
    })
  }

  function handleSaveLesson(lesson: {
    title: string
    contentType: "TEXT" | "VIDEO" | "PDF" | "MIXED"
    contentBody: string
  }) {
    startAddLesson(async () => {
      const formData = new FormData()
      formData.set("title", lesson.title)
      formData.set("contentType", lesson.contentType)
      formData.set("contentBody", lesson.contentBody)

      if (editingLessonId) {
        const result = await updateLessonAction(editingLessonId, formData)
        if (result.success) {
          toast.success("Lesson updated!")
          setLessonEditorOpen(false)
          router.refresh()
        } else {
          toast.error(result.error ?? "Failed to update lesson")
        }
      } else {
        formData.set("moduleId", module.id)
        formData.set("order", String(module.lessons?.length ?? 0))
        const result = await createLessonAction(formData)
        if (result.success) {
          toast.success("Lesson created!")
          setLessonEditorOpen(false)
          router.refresh()
        } else {
          toast.error(result.error ?? "Failed to create lesson")
        }
      }
    })
  }

  function handleDeleteLesson(lessonId: string) {
    if (!confirm("Delete this lesson?")) return
    startDeleteLesson(async () => {
      const result = await deleteLessonAction(lessonId)
      if (result.success) {
        toast.success("Lesson deleted")
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed to delete lesson")
      }
    })
  }

  function handleAddQuiz() {
    startAddQuiz(async () => {
      const formData = new FormData()
      formData.set("moduleId", module.id)
      formData.set("title", `${module.title} Quiz`)
      formData.set("passingScore", "70")
      const result = await createQuizAction(formData)
      if (result.success) {
        toast.success("Quiz created!")
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed to create quiz")
      }
    })
  }

  return (
    <div className="rounded border border-border">
      <Accordion>
        <AccordionItem value={0}>
          <AccordionTrigger className="px-3">
            <div className="flex items-center gap-2">
              <GripVertical className="size-4 text-text-muted" />
              <span className="font-medium text-olive-deep">
                Module {index + 1}: {module.title}
              </span>
              <Badge variant="outline" className="ml-2">
                {module.lessons?.length ?? 0} lessons
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 px-3 pb-3">
              <div className="space-y-1.5">
                <Label>Module Title</Label>
                <Input
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  placeholder="Module title"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={moduleDescription}
                  onChange={(e) => setModuleDescription(e.target.value)}
                  placeholder="Module description..."
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveModule} disabled={isSaving}>
                  {isSaving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                  Save Module
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDeleteModule}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                  Delete
                </Button>
              </div>

              {/* Lessons list */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Lessons</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingLessonId(null)
                      setEditingLesson({
                        title: "",
                        contentType: "TEXT",
                        contentBody: '{"blocks": []}',
                      })
                      setLessonEditorOpen(true)
                    }}
                  >
                    <Plus className="size-3" />
                    Add Lesson
                  </Button>
                </div>
                <ul className="space-y-1">
                  {module.lessons?.map((lesson, li) => (
                    <li
                      key={lesson.id}
                      className="flex items-center gap-2 rounded border border-border px-3 py-2"
                    >
                      <GripVertical className="size-3 text-text-muted" />
                      <span className="flex-1 text-sm">
                        {li + 1}. {lesson.title}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {lesson.contentType}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => {
                          setEditingLessonId(lesson.id)
                          setEditingLesson({
                            title: lesson.title,
                            contentType: lesson.contentType,
                            contentBody: JSON.stringify(
                              lesson.contentBody,
                              null,
                              2
                            ),
                          })
                          setLessonEditorOpen(true)
                        }}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDeleteLesson(lesson.id)}
                        disabled={isDeletingLesson}
                      >
                        <Trash2 className="size-3 text-red-500" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quiz section */}
              <div>
                <Label className="mb-2">Quiz</Label>
                {module.quiz ? (
                  <QuizEditor
                    quizId={module.quiz.id}
                    questions={module.quiz.questions ?? []}
                    passingScore={module.quiz.passingScore}
                    onQuestionsChange={() => {
                      router.refresh()
                    }}
                    onPassingScoreChange={() => {
                      router.refresh()
                    }}
                  />
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddQuiz}
                    disabled={isAddingQuiz}
                  >
                    {isAddingQuiz ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Plus className="size-3" />
                    )}
                    Add Quiz
                  </Button>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <LessonEditor
        open={lessonEditorOpen}
        onOpenChange={setLessonEditorOpen}
        lesson={editingLesson}
        onSave={handleSaveLesson}
        isSaving={isAddingLesson}
      />
    </div>
  )
}
