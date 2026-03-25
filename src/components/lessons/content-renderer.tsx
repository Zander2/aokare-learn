"use client"

import type { ContentBlock } from "@/types"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { FileText, Download, ExternalLink, Play, GraduationCap, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface ContentRendererProps {
  blocks: ContentBlock[]
}

function parseContent(content: string): { objectives: string[]; body: string } {
  const lines = content.split('\n')
  const objectives: string[] = []
  let bodyStartIndex = 0
  let inObjectives = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Skip title lines
    if (line.startsWith('# ') && i < 3) continue
    if (line.startsWith('## Module') && i < 5) continue
    if (line === '---') continue
    if (line === '') continue

    // Detect objectives section
    if (line.includes('Learning Objectives') || line.includes('learning objectives')) {
      inObjectives = true
      continue
    }

    if (inObjectives) {
      if (line.startsWith('- ') || line.startsWith('* ')) {
        objectives.push(line.replace(/^[-*]\s*/, ''))
      } else if (line === '' || line === '---') {
        inObjectives = false
        bodyStartIndex = i + 1
      } else {
        inObjectives = false
        bodyStartIndex = i
      }
      continue
    }

    if (objectives.length > 0 && !inObjectives) {
      bodyStartIndex = i
      break
    }
  }

  // If we never found objectives, return all content as body (stripped of metadata)
  if (objectives.length === 0) {
    const strippedLines = lines.filter((line, i) => {
      const trimmed = line.trim()
      if (i < 5 && trimmed.startsWith('# ')) return false
      if (i < 5 && trimmed.startsWith('## Module')) return false
      if (i < 5 && trimmed === '---') return false
      return true
    })
    return { objectives: [], body: strippedLines.join('\n').trim() }
  }

  const body = lines.slice(bodyStartIndex).join('\n').trim()
  return { objectives, body }
}

function ObjectivesCard({ objectives }: { objectives: string[] }) {
  return (
    <div className="mb-8 rounded-lg border border-border bg-olive/[0.03] p-6">
      <div className="mb-4 flex items-center gap-2">
        <GraduationCap className="size-5 text-olive" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-olive-deep">
          What you&apos;ll learn
        </h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {objectives.map((obj, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <Target className="mt-0.5 size-4 shrink-0 text-olive" />
            <span className="text-sm leading-relaxed text-text-primary">{obj}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TextBlock({ content }: { content: string }) {
  const { objectives, body } = parseContent(content)

  return (
    <div>
      {objectives.length > 0 && <ObjectivesCard objectives={objectives} />}
      <div className="prose prose-lg max-w-none
        prose-headings:text-olive-deep prose-headings:font-semibold
        prose-h1:text-2xl prose-h1:border-l-[3px] prose-h1:border-olive prose-h1:pl-4 prose-h1:mb-6
        prose-h2:text-xl prose-h2:border-l-[3px] prose-h2:border-olive prose-h2:pl-4 prose-h2:mt-10 prose-h2:mb-4
        prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3
        prose-p:text-[15.5px] prose-p:leading-[1.75] prose-p:text-text-primary
        prose-strong:text-olive-deep prose-strong:font-semibold
        prose-a:text-olive prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-olive-deep
        prose-ul:my-4 prose-li:text-[15.5px] prose-li:leading-[1.75]
        prose-ol:my-4
        prose-blockquote:border-l-[3px] prose-blockquote:border-olive prose-blockquote:bg-olive/5 prose-blockquote:rounded-r prose-blockquote:py-1 prose-blockquote:not-italic
        prose-code:bg-olive/10 prose-code:text-olive-deep prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-[#1C1C1C] prose-pre:rounded-lg prose-pre:border prose-pre:border-border
        prose-table:text-sm
        prose-th:bg-olive/10 prose-th:text-olive-deep prose-th:font-semibold
        prose-td:border-border
        prose-hr:border-border
      ">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
      </div>
    </div>
  )
}

function VideoBlock({ url, caption }: { url: string; caption?: string }) {
  // Extract YouTube video ID
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?#]+)/
  )
  const videoId = match ? match[1] : null

  return (
    <div className="my-8">
      {videoId ? (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="relative aspect-video">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}`}
              title={caption ?? "Video"}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {caption && (
            <div className="border-t border-border bg-olive/[0.03] px-4 py-2.5">
              <p className="text-sm font-medium text-text-primary">{caption}</p>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded bg-olive/10">
                <Play className="size-5 text-olive" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-olive hover:text-olive-deep">
                  {caption || "Watch related video on YouTube"}
                </p>
                <p className="truncate text-xs text-text-muted">
                  Opens YouTube in a new tab
                </p>
              </div>
              <ExternalLink className="size-4 shrink-0 text-text-muted" />
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function PdfBlock({ url, title }: { url: string; title: string }) {
  return (
    <div className="my-4 rounded-lg border border-border p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-olive/10">
          <FileText className="size-5 text-olive" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-text-primary">{title}</p>
          <p className="text-xs text-text-muted">PDF Document</p>
        </div>
        <Button variant="outline" size="sm" render={<a href={url} target="_blank" rel="noopener noreferrer" />}>
          View PDF
        </Button>
      </div>
    </div>
  )
}

function DownloadBlock({ url, label }: { url: string; label: string }) {
  return (
    <div className="my-4 rounded-lg border border-border p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-olive/10">
          <Download className="size-5 text-olive" />
        </div>
        <span className="flex-1 text-sm font-medium text-text-primary">
          {label}
        </span>
        <Button variant="outline" size="sm" render={<a href={url} download />}>
          Download
        </Button>
      </div>
    </div>
  )
}

function LinkBlock({
  url,
  label,
  description,
}: {
  url: string
  label: string
  description?: string
}) {
  return (
    <div className="my-4">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:border-olive/30 hover:bg-olive/[0.02]"
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-olive/10">
          <ExternalLink className="size-4 text-olive" />
        </div>
        <div>
          <p className="text-sm font-medium text-olive-deep group-hover:text-olive">{label}</p>
          {description && (
            <p className="mt-0.5 text-xs text-text-muted">{description}</p>
          )}
        </div>
      </a>
    </div>
  )
}

export function ContentRenderer({ blocks }: ContentRendererProps) {
  return (
    <div className="space-y-6">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "text":
            return <TextBlock key={i} content={block.content} />
          case "video":
            return <VideoBlock key={i} url={block.url} caption={block.caption} />
          case "pdf":
            return <PdfBlock key={i} url={block.url} title={block.title} />
          case "download":
            return <DownloadBlock key={i} url={block.url} label={block.label} />
          case "link":
            return (
              <LinkBlock
                key={i}
                url={block.url}
                label={block.label}
                description={block.description}
              />
            )
          default:
            return null
        }
      })}
    </div>
  )
}
