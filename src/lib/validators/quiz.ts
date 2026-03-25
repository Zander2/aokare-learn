import { z } from "zod"

export const questionSchema = z.object({
  text: z.string().min(1, "Question text is required"),
  type: z.enum(["MCQ", "TRUEFALSE"]),
  options: z.array(z.string()).min(2, "At least 2 options required"),
  correctAnswer: z.string().min(1, "Correct answer is required"),
  explanation: z.string().optional(),
})

export const createQuizSchema = z.object({
  moduleId: z.string().min(1, "Module ID is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  passingScore: z
    .number()
    .int()
    .min(0, "Passing score must be between 0 and 100")
    .max(100, "Passing score must be between 0 and 100")
    .default(70),
})

export const updateQuizSchema = createQuizSchema.partial()

export const submitQuizSchema = z.object({
  quizId: z.string().min(1, "Quiz ID is required"),
  answers: z.record(z.string(), z.string()),
})

export type QuestionInput = z.infer<typeof questionSchema>
export type CreateQuizInput = z.infer<typeof createQuizSchema>
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>
export type SubmitQuizInput = z.infer<typeof submitQuizSchema>
