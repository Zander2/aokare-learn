export const dynamic = "force-dynamic"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Pencil } from "lucide-react"
import { getAllCourses } from "@/lib/services/course-service"
import { AdminCourseDeleteButton } from "@/components/admin/course-delete-button"

export default async function AdminCoursesPage() {
  const courses = await getAllCourses()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-olive-deep">
          Manage Courses
        </h1>
        <Button render={<Link href="/admin/courses/new" />}>
          <Plus className="size-4" />
          Create Course
        </Button>
      </div>

      <div className="rounded border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Modules</TableHead>
              <TableHead>Enrollments</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((course) => (
              <TableRow key={course.id}>
                <TableCell className="font-medium">{course.title}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      course.status === "PUBLISHED" ? "default" : "outline"
                    }
                  >
                    {course.status === "PUBLISHED" ? "Published" : "Draft"}
                  </Badge>
                </TableCell>
                <TableCell>{course._count.modules}</TableCell>
                <TableCell>{course._count.enrollments}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      render={<Link href={`/admin/courses/${course.id}`} />}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <AdminCourseDeleteButton courseId={course.id} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {courses.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-text-muted">
                  No courses yet. Create your first course.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
