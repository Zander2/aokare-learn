export const dynamic = "force-dynamic"

import { CourseCard } from "@/components/courses/course-card"
import { getAllPublishedCourses, searchCourses } from "@/lib/services/course-service"
import { CourseSearchBar } from "@/components/courses/course-search-bar"

interface CourseCatalogPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function CourseCatalogPage({ searchParams }: CourseCatalogPageProps) {
  const params = await searchParams
  const query = params.q ?? ""

  const courses = query
    ? await searchCourses(query)
    : await getAllPublishedCourses()

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Page header */}
      <div className="mb-8 border-b border-border pb-6">
        <h1 className="text-3xl font-bold text-olive-deep">Course Catalog</h1>
        <p className="mt-2 text-sm text-text-muted">
          Explore our courses and start learning today.
        </p>
      </div>

      {/* Search */}
      <div className="mb-8 max-w-md">
        <CourseSearchBar defaultValue={query} />
      </div>

      {/* Results info when searching */}
      {query && courses.length > 0 && (
        <p className="mb-4 text-sm text-text-muted">
          {courses.length} {courses.length === 1 ? "result" : "results"} for &ldquo;{query}&rdquo;
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <CourseCard
            key={course.slug}
            slug={course.slug}
            title={course.title}
            description={course.description ?? ""}
            thumbnailUrl={course.thumbnailUrl}
            moduleCount={course._count.modules}
          />
        ))}
      </div>

      {courses.length === 0 && (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-text-muted">
            {query
              ? `No courses found matching "${query}".`
              : "No courses available yet. Check back soon!"}
          </p>
          {query && (
            <a href="/courses" className="text-sm font-medium text-olive hover:text-olive-deep transition-colors">
              Clear search
            </a>
          )}
        </div>
      )}
    </div>
  )
}
