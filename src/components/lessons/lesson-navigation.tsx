import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface LessonLink {
  slug: string
  title: string
}

interface LessonNavigationProps {
  prevLesson: LessonLink | null
  nextLesson: LessonLink | null
}

export function LessonNavigation({
  prevLesson,
  nextLesson,
}: LessonNavigationProps) {
  return (
    <div className="flex items-center justify-between border-t border-border pt-6">
      {prevLesson ? (
        <Button variant="outline" render={<Link href={prevLesson.slug} />}>
          <ChevronLeft className="size-4" />
          {prevLesson.title}
        </Button>
      ) : (
        <div />
      )}

      {nextLesson ? (
        <Button render={<Link href={nextLesson.slug} />}>
          {nextLesson.title}
          <ChevronRight className="size-4" />
        </Button>
      ) : (
        <div />
      )}
    </div>
  )
}
