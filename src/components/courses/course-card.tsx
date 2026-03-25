import Link from "next/link"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookOpen } from "lucide-react"

interface CourseCardProps {
  slug: string
  title: string
  description: string
  thumbnailUrl: string | null
  moduleCount: number
}

export function CourseCard({
  slug,
  title,
  description,
  thumbnailUrl,
  moduleCount,
}: CourseCardProps) {
  return (
    <div className="group flex flex-col rounded-lg border border-border bg-white transition-colors hover:border-olive/40 overflow-hidden">
      {/* Header area */}
      <div className="relative h-36 bg-olive/10 flex items-center justify-center">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-olive/[0.08]">
            <BookOpen className="size-10 text-olive-light" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-1 text-base font-semibold text-olive-deep leading-snug">
          {title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-text-muted">
          {description}
        </p>

        <div className="mt-auto flex items-center justify-between pt-4">
          <Badge variant="outline" className="text-xs">
            {moduleCount} {moduleCount === 1 ? "module" : "modules"}
          </Badge>
          <Button size="sm" render={<Link href={`/courses/${slug}`} />}>
            View Course
          </Button>
        </div>
      </div>
    </div>
  )
}
