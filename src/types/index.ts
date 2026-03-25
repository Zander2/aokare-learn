export interface User {
  id: string
  email: string
  name: string | null
  image: string | null
  role: "ADMIN" | "LEARNER"
}

export interface Course {
  id: string
  slug: string
  title: string
  description: string | null
  thumbnailUrl: string | null
  status: "DRAFT" | "PUBLISHED"
  createdAt: string
  updatedAt: string
  modules?: Module[]
  _count?: { modules: number; enrollments: number }
}

export interface Module {
  id: string
  courseId: string
  title: string
  description: string | null
  order: number
  lessons?: Lesson[]
  quiz?: Quiz | null
}

export interface Lesson {
  id: string
  moduleId: string
  title: string
  order: number
  contentType: "TEXT" | "VIDEO" | "PDF" | "MIXED"
  contentBody: ContentBody
}

export interface ContentBody {
  blocks: ContentBlock[]
}

export type ContentBlock =
  | { type: "text"; content: string }
  | { type: "video"; url: string; caption?: string }
  | { type: "pdf"; url: string; title: string }
  | { type: "download"; url: string; label: string }
  | { type: "link"; url: string; label: string; description?: string }

export interface Quiz {
  id: string
  moduleId: string
  title: string
  description: string | null
  passingScore: number
  questions?: Question[]
}

export interface Question {
  id: string
  quizId: string
  text: string
  type: "MCQ" | "TRUEFALSE"
  options: string[]
  correctAnswer: string
  explanation: string | null
}

export interface QuizAttempt {
  id: string
  userId: string
  quizId: string
  score: number
  passed: boolean
  answers: Record<string, string>
  createdAt: string
}

export interface Progress {
  id: string
  lessonId: string
  completed: boolean
  completedAt: string | null
}

export interface Enrollment {
  id: string
  userId: string
  courseId: string
  enrolledAt: string
  completedAt: string | null
  course?: Course
}

export interface Certificate {
  id: string
  userId: string
  courseId: string
  issuedAt: string
  certificateUrl: string | null
  course?: Course
}
