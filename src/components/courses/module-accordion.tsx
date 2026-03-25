"use client"

import Link from "next/link"
import type { Module } from "@/types"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { FileText, Video, FileDown, CheckCircle2, ClipboardList, Lock } from "lucide-react"

interface ModuleAccordionProps {
  modules: Module[]
  courseSlug: string
  completedLessonIds: string[]
  isEnrolled: boolean
}

function getLessonIcon(contentType: string) {
  switch (contentType) {
    case "VIDEO":
      return Video
    case "PDF":
      return FileDown
    default:
      return FileText
  }
}

export function ModuleAccordion({
  modules,
  courseSlug,
  completedLessonIds,
  isEnrolled,
}: ModuleAccordionProps) {
  return (
    <Accordion defaultValue={[0]}>
      {modules.map((mod, index) => (
        <AccordionItem key={mod.id} value={index} className="border border-border rounded-lg mb-3 overflow-hidden">
          <AccordionTrigger className="px-4 py-3.5 hover:bg-olive/[0.03] hover:no-underline">
            <div className="flex flex-1 items-center gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-olive/10">
                <span className="text-xs font-semibold text-olive">{index + 1}</span>
              </div>
              <span className="text-sm font-semibold text-olive-deep text-left">{mod.title}</span>
              <div className="ml-auto flex items-center gap-2 mr-2">
                <Badge variant="outline" className="text-xs">
                  {mod.lessons?.length ?? 0} lessons
                </Badge>
                {mod.quiz && (
                  <Badge variant="secondary" className="text-xs">
                    Quiz
                  </Badge>
                )}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="border-t border-border bg-stone-white/50">
            <ul className="px-4 py-2 space-y-0.5">
              {mod.lessons?.map((lesson) => {
                const Icon = getLessonIcon(lesson.contentType)
                const isComplete = completedLessonIds.includes(lesson.id)

                if (!isEnrolled) {
                  return (
                    <li key={lesson.id}>
                      <span className="flex cursor-not-allowed items-center gap-3 rounded px-2 py-2 text-sm opacity-50">
                        <Lock className="size-4 shrink-0 text-text-muted" />
                        <span className="flex-1 text-text-muted">{lesson.title}</span>
                      </span>
                    </li>
                  )
                }

                return (
                  <li key={lesson.id}>
                    <Link
                      href={`/courses/${courseSlug}/modules/${mod.id}/lessons/${lesson.id}`}
                      className="flex items-center gap-3 rounded px-2 py-2 text-sm transition-colors hover:bg-olive/[0.06] hover:text-olive-deep"
                    >
                      <Icon className="size-4 shrink-0 text-text-muted" />
                      <span className="flex-1 text-text-primary">{lesson.title}</span>
                      {isComplete && (
                        <CheckCircle2 className="size-4 shrink-0 text-olive" />
                      )}
                    </Link>
                  </li>
                )
              })}
              {mod.quiz && (
                <li>
                  {isEnrolled ? (
                    <Link
                      href={`/courses/${courseSlug}/modules/${mod.id}/quiz`}
                      className="flex items-center gap-3 rounded px-2 py-2 text-sm transition-colors hover:bg-olive/[0.06] hover:text-olive-deep"
                    >
                      <ClipboardList className="size-4 shrink-0 text-text-muted" />
                      <span className="flex-1 text-text-primary">{mod.quiz.title}</span>
                    </Link>
                  ) : (
                    <span className="flex cursor-not-allowed items-center gap-3 rounded px-2 py-2 text-sm opacity-50">
                      <Lock className="size-4 shrink-0 text-text-muted" />
                      <span className="flex-1 text-text-muted">{mod.quiz.title}</span>
                    </span>
                  )}
                </li>
              )}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
