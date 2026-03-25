import { PrismaClient } from "@prisma/client"
import { readFileSync } from "fs"
import { join } from "path"

const prisma = new PrismaClient()

interface VideoEntry {
  module: number
  lesson: number
  title: string
  videoUrl: string
  videoTitle: string
}

interface ContentBlock {
  type: string
  url?: string
  content?: string
  caption?: string
  label?: string
  title?: string
  description?: string
}

interface ContentBody {
  blocks: ContentBlock[]
}

async function updateCourseVideos(courseSlug: string, videosFile: string) {
  const videos: VideoEntry[] = JSON.parse(
    readFileSync(videosFile, "utf-8")
  )

  const course = await prisma.course.findUnique({
    where: { slug: courseSlug },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
          },
        },
      },
    },
  })

  if (!course) {
    console.log(`  Course ${courseSlug} not found, skipping.`)
    return
  }

  let updated = 0

  for (const video of videos) {
    const mod = course.modules[video.module - 1]
    if (!mod) {
      console.log(`  Module ${video.module} not found`)
      continue
    }

    const lesson = mod.lessons[video.lesson - 1]
    if (!lesson) {
      console.log(`  Lesson ${video.module}.${video.lesson} not found`)
      continue
    }

    const contentBody = lesson.contentBody as unknown as ContentBody
    if (!contentBody?.blocks) continue

    const newBlocks = contentBody.blocks.map((block) => {
      if (block.type === "video") {
        return {
          ...block,
          url: video.videoUrl,
          caption: video.videoTitle,
        }
      }
      return block
    })

    await prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        contentBody: { blocks: newBlocks } as unknown as object,
      },
    })

    updated++
    console.log(`  ✓ ${video.module}.${video.lesson}: ${video.videoTitle}`)
  }

  console.log(`  Updated ${updated} lessons for ${courseSlug}`)
}

async function main() {
  const contentDir = join(__dirname, "../../content")

  console.log("Updating Dispute Resolution AP videos...")
  await updateCourseVideos(
    "dispute-resolution-ap",
    join(contentDir, "dispute-resolution-ap/videos.json")
  )

  console.log("\nUpdating Early Payment Discounts AP videos...")
  await updateCourseVideos(
    "early-payment-discounts-ap",
    join(contentDir, "early-payment-discounts-ap/videos.json")
  )

  console.log("\nDone!")
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
