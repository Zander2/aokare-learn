"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"

interface LessonEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lesson: {
    title: string
    contentType: "TEXT" | "VIDEO" | "PDF" | "MIXED"
    contentBody: string
  }
  onSave: (lesson: {
    title: string
    contentType: "TEXT" | "VIDEO" | "PDF" | "MIXED"
    contentBody: string
  }) => void
  isSaving?: boolean
}

export function LessonEditor({
  open,
  onOpenChange,
  lesson,
  onSave,
  isSaving,
}: LessonEditorProps) {
  const [title, setTitle] = useState(lesson.title)
  const [contentType, setContentType] = useState<"TEXT" | "VIDEO" | "PDF" | "MIXED">(lesson.contentType)
  const [contentBody, setContentBody] = useState(lesson.contentBody)

  useEffect(() => {
    setTitle(lesson.title)
    setContentType(lesson.contentType)
    setContentBody(lesson.contentBody)
  }, [lesson.title, lesson.contentType, lesson.contentBody])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Lesson</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lesson-title">Title</Label>
            <Input
              id="lesson-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Lesson title"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Content Type</Label>
            <Select
              value={contentType}
              onValueChange={(val) => {
                if (val) setContentType(val as "TEXT" | "VIDEO" | "PDF" | "MIXED")
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TEXT">Text</SelectItem>
                <SelectItem value="VIDEO">Video</SelectItem>
                <SelectItem value="PDF">PDF</SelectItem>
                <SelectItem value="MIXED">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lesson-content">Content (JSON)</Label>
            <Textarea
              id="lesson-content"
              value={contentBody}
              onChange={(e) => setContentBody(e.target.value)}
              placeholder='{"blocks": []}'
              rows={8}
              className="font-mono text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => onSave({ title, contentType, contentBody })}
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            Save Lesson
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
