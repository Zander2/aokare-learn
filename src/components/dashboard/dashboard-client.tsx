"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { EnrolledCourseCard } from "@/components/dashboard/enrolled-course-card"
import { CertificateCard } from "@/components/dashboard/certificate-card"

interface EnrolledCourseData {
  title: string
  slug: string
  progress: number
  totalLessons: number
  completedLessons: number
}

interface CertificateData {
  courseTitle: string
  issuedAt: string
  certificateUrl: string | null
}

interface DashboardClientProps {
  inProgressCourses: EnrolledCourseData[]
  completedCourses: EnrolledCourseData[]
  certificates: CertificateData[]
}

export function DashboardClient({
  inProgressCourses,
  completedCourses,
  certificates,
}: DashboardClientProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Page header */}
      <div className="mb-8 border-b border-border pb-6">
        <h1 className="text-3xl font-bold text-olive-deep">My Learning</h1>
        <p className="mt-2 text-sm text-text-muted">
          Track your progress and continue where you left off.
        </p>
      </div>

      <Tabs defaultValue="in-progress" className="mt-6">
        <TabsList>
          <TabsTrigger value="in-progress">
            In Progress
            {inProgressCourses.length > 0 && (
              <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-olive/15 text-xs font-semibold text-olive-deep">
                {inProgressCourses.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed
            {completedCourses.length > 0 && (
              <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-olive/15 text-xs font-semibold text-olive-deep">
                {completedCourses.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="in-progress">
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            {inProgressCourses.map((course) => (
              <EnrolledCourseCard key={course.slug} {...course} />
            ))}
          </div>
          {inProgressCourses.length === 0 && (
            <div className="mt-12 flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-text-muted">No courses in progress yet.</p>
              <a href="/courses" className="text-sm font-medium text-olive hover:text-olive-deep transition-colors">
                Browse the course catalog
              </a>
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            {completedCourses.map((course) => (
              <EnrolledCourseCard key={course.slug} {...course} />
            ))}
          </div>
          {completedCourses.length === 0 && (
            <p className="mt-12 text-center text-sm text-text-muted">
              No completed courses yet. Keep learning!
            </p>
          )}
        </TabsContent>
      </Tabs>

      {/* Certificates */}
      <div className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-olive-deep">Certificates</h2>
        </div>
        <div className="space-y-3">
          {certificates.map((cert) => (
            <CertificateCard key={cert.courseTitle} {...cert} />
          ))}
        </div>
        {certificates.length === 0 && (
          <div className="rounded-lg border border-border bg-stone-white/50 px-5 py-6">
            <p className="text-sm text-text-muted">
              Complete a course to earn your first certificate.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
