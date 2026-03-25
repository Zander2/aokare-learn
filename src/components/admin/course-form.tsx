"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload } from "lucide-react"

interface CourseFormProps {
  title: string
  slug: string
  description: string
  status: "DRAFT" | "PUBLISHED"
  onTitleChange: (value: string) => void
  onSlugChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onStatusChange: (value: "DRAFT" | "PUBLISHED") => void
}

export function CourseForm({
  title,
  slug,
  description,
  status,
  onTitleChange,
  onSlugChange,
  onDescriptionChange,
  onStatusChange,
}: CourseFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="course-title">Title</Label>
        <Input
          id="course-title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Course title"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="course-slug">Slug</Label>
        <Input
          id="course-slug"
          value={slug}
          onChange={(e) => onSlugChange(e.target.value)}
          placeholder="course-slug"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="course-description">Description</Label>
        <Textarea
          id="course-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Course description..."
          rows={4}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select value={status} onValueChange={(val) => { if (val) onStatusChange(val as "DRAFT" | "PUBLISHED") }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Thumbnail</Label>
        <div className="flex h-32 items-center justify-center rounded border border-dashed border-border bg-olive/5">
          <div className="text-center">
            <Upload className="mx-auto size-6 text-text-muted" />
            <p className="mt-1 text-xs text-text-muted">
              Drop image here or click to upload
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
