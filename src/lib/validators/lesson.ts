import { z } from "zod"

const textBlockSchema = z.object({
  type: z.literal("text"),
  content: z.string(),
})

const videoBlockSchema = z.object({
  type: z.literal("video"),
  url: z.string().url(),
  title: z.string().optional(),
})

const imageBlockSchema = z.object({
  type: z.literal("image"),
  url: z.string().url(),
  alt: z.string().optional(),
})

const codeBlockSchema = z.object({
  type: z.literal("code"),
  language: z.string(),
  content: z.string(),
})

const headingBlockSchema = z.object({
  type: z.literal("heading"),
  level: z.number().int().min(1).max(6),
  content: z.string(),
})

export const contentBlockSchema = z.discriminatedUnion("type", [
  textBlockSchema,
  videoBlockSchema,
  imageBlockSchema,
  codeBlockSchema,
  headingBlockSchema,
])

export const createLessonSchema = z.object({
  moduleId: z.string().min(1, "Module ID is required"),
  title: z.string().min(1, "Title is required"),
  order: z.number().int().min(0, "Order must be a non-negative integer"),
  contentType: z.enum(["TEXT", "VIDEO", "PDF", "MIXED"]).default("TEXT"),
  contentBody: z.array(contentBlockSchema).default([]),
})

export const updateLessonSchema = createLessonSchema.partial()

export type ContentBlock = z.infer<typeof contentBlockSchema>
export type CreateLessonInput = z.infer<typeof createLessonSchema>
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>
