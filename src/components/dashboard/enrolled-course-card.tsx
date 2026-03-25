import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

interface EnrolledCourseCardProps {
  title: string
  slug: string
  progress: number
  totalLessons: number
  completedLessons: number
}

export function EnrolledCourseCard({
  title,
  slug,
  progress,
  totalLessons,
  completedLessons,
}: EnrolledCourseCardProps) {
  return (
    <div className="rounded-lg border border-border bg-white p-5 transition-colors hover:border-olive/40">
      <h3 className="mb-3 text-base font-semibold text-olive-deep leading-snug">
        {title}
      </h3>
      <div className="space-y-2">
        <Progress value={progress} />
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted">
            {completedLessons} of {totalLessons} lessons &middot; <span className="font-medium text-olive-deep">{progress}%</span>
          </p>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button size="sm" render={<Link href={`/courses/${slug}`} />}>
          Continue
        </Button>
      </div>
    </div>
  )
}
