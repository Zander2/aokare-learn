import { Loader2 } from "lucide-react"

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-olive-deep">My Learning</h1>
      <div className="mt-12 flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-olive" />
      </div>
    </div>
  )
}
