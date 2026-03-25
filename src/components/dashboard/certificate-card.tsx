import { Button } from "@/components/ui/button"
import { Award } from "lucide-react"

interface CertificateCardProps {
  courseTitle: string
  issuedAt: string
  certificateUrl: string | null
}

export function CertificateCard({
  courseTitle,
  issuedAt,
  certificateUrl,
}: CertificateCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-white p-4 transition-colors hover:border-olive/40">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-olive/10">
        <Award className="size-5 text-olive" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-olive-deep">{courseTitle}</p>
        <p className="text-xs text-text-muted">
          Issued{" "}
          {new Date(issuedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        render={
          certificateUrl ? (
            <a href={certificateUrl} download />
          ) : (
            <span />
          )
        }
        disabled={!certificateUrl}
      >
        Download
      </Button>
    </div>
  )
}
