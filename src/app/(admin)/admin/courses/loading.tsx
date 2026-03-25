import { Loader2 } from "lucide-react"

export default function AdminCoursesLoading() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-olive-deep">Manage Courses</h1>
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-olive" />
      </div>
    </div>
  )
}
