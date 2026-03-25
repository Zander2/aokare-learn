export const dynamic = "force-dynamic"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { BookOpen, Users, GraduationCap, Award } from "lucide-react"
import { prisma } from "@/lib/prisma"

export default async function AdminDashboardPage() {
  const [courseCount, userCount, enrollmentCount, certificateCount, recentEnrollments] =
    await Promise.all([
      prisma.course.count(),
      prisma.user.count(),
      prisma.enrollment.count(),
      prisma.certificate.count(),
      prisma.enrollment.findMany({
        take: 10,
        orderBy: { enrolledAt: "desc" },
        include: {
          user: { select: { name: true, email: true } },
          course: { select: { title: true } },
        },
      }),
    ])

  const stats = [
    { label: "Total Courses", value: String(courseCount), icon: BookOpen },
    { label: "Total Learners", value: String(userCount), icon: Users },
    { label: "Active Enrollments", value: String(enrollmentCount), icon: GraduationCap },
    { label: "Certificates Issued", value: String(certificateCount), icon: Award },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-olive-deep">Dashboard</h1>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded bg-olive/10">
                <stat.icon className="size-5 text-olive" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-olive-deep">
                  {stat.value}
                </p>
                <p className="text-xs text-text-muted">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent enrollments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-olive-deep">Recent Enrollments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Learner</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentEnrollments.map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell className="font-medium">
                    {enrollment.user.name ?? enrollment.user.email}
                  </TableCell>
                  <TableCell>{enrollment.course.title}</TableCell>
                  <TableCell className="text-text-muted">
                    {enrollment.enrolledAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                </TableRow>
              ))}
              {recentEnrollments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-text-muted">
                    No enrollments yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
