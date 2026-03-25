"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CourseForm } from "@/components/admin/course-form"
import { ModuleEditor } from "@/components/admin/module-editor"
import type { Module, Question } from "@/types"
import { Plus, Loader2 } from "lucide-react"
import { createCourseAction, updateCourseAction } from "@/lib/actions/course-actions"
import { createModuleAction } from "@/lib/actions/module-actions"
import { toast } from "sonner"

type ModuleWithQuizQuestions = Module & {
  quiz?: {
    id: string
    moduleId: string
    title: string
    description: string | null
    passingScore: number
    questions?: Question[]
  } | null
}

interface AdminCourseEditorClientProps {
  isNew: boolean
  courseId: string | null
  initialTitle: string
  initialSlug: string
  initialDescription: string
  initialStatus: "DRAFT" | "PUBLISHED"
  initialModules: ModuleWithQuizQuestions[]
}

export function AdminCourseEditorClient({
  isNew,
  courseId,
  initialTitle,
  initialSlug,
  initialDescription,
  initialStatus,
  initialModules,
}: AdminCourseEditorClientProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [slug, setSlug] = useState(initialSlug)
  const [description, setDescription] = useState(initialDescription)
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">(initialStatus)
  const [isSaving, startSave] = useTransition()
  const [isAddingModule, startAddModule] = useTransition()

  function handleSave() {
    startSave(async () => {
      const formData = new FormData()
      formData.set("title", title)
      formData.set("slug", slug)
      formData.set("description", description)
      formData.set("status", status)

      if (isNew) {
        const result = await createCourseAction(formData)
        if (result.success && result.data) {
          toast.success("Course created successfully!")
          router.push(`/admin/courses/${result.data.id}`)
        } else {
          toast.error("error" in result ? result.error : "Failed to create course")
        }
      } else if (courseId) {
        const result = await updateCourseAction(courseId, formData)
        if (result.success) {
          toast.success("Course saved successfully!")
          router.refresh()
        } else {
          toast.error("error" in result ? result.error : "Failed to save course")
        }
      }
    })
  }

  function handleAddModule() {
    if (!courseId) {
      toast.error("Please save the course first before adding modules.")
      return
    }

    startAddModule(async () => {
      const formData = new FormData()
      formData.set("courseId", courseId)
      formData.set("title", "New Module")
      formData.set("order", String(initialModules.length))

      const result = await createModuleAction(formData)
      if (result.success) {
        toast.success("Module added!")
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed to add module")
      }
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-olive-deep">
          {isNew ? "Create Course" : "Edit Course"}
        </h1>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="size-4 animate-spin" />}
          {isNew ? "Create Course" : "Save Course"}
        </Button>
      </div>

      <div className="rounded border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-olive-deep">
          Course Details
        </h2>
        <CourseForm
          title={title}
          slug={slug}
          description={description}
          status={status}
          onTitleChange={setTitle}
          onSlugChange={setSlug}
          onDescriptionChange={setDescription}
          onStatusChange={setStatus}
        />
      </div>

      {!isNew && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-olive-deep">Modules</h2>
            <Button
              variant="outline"
              onClick={handleAddModule}
              disabled={isAddingModule}
            >
              {isAddingModule ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Add Module
            </Button>
          </div>

          <div className="space-y-4">
            {initialModules.map((mod, index) => (
              <ModuleEditor key={mod.id} module={mod} index={index} />
            ))}
            {initialModules.length === 0 && (
              <p className="text-center text-sm text-text-muted py-8">
                No modules yet. Add your first module.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
