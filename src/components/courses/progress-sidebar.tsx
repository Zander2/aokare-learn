import { Progress } from "@/components/ui/progress"

interface ProgressSidebarProps {
  completedLessons: number
  totalLessons: number
  enrolledAt: string
}

export function ProgressSidebar({
  completedLessons,
  totalLessons,
  enrolledAt,
}: ProgressSidebarProps) {
  const percentage =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  return (
    <div className="rounded-lg border border-border p-5">
      <h3 className="mb-4 text-sm font-semibold text-olive-deep">Your Progress</h3>

      <div className="space-y-3">
        <div className="flex items-end justify-between">
          <span className="text-2xl font-bold text-olive-deep">{percentage}%</span>
          <span className="text-xs text-text-muted">complete</span>
        </div>
        <Progress value={percentage} />
        <p className="text-xs text-text-muted">
          <span className="font-medium text-text-primary">{completedLessons}</span> of{" "}
          <span className="font-medium text-text-primary">{totalLessons}</span> lessons done
        </p>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-xs text-text-muted">
          Enrolled{" "}
          {new Date(enrolledAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
    </div>
  )
}
