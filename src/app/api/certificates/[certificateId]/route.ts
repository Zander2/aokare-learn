import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import {
  getCertificateById,
  generateCertificatePdf,
} from "@/lib/services/certificate-service"
import { existsSync } from "fs"
import { readFile } from "fs/promises"
import { join } from "path"

type RouteParams = { params: { certificateId: string } }

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const certificate = await getCertificateById(params.certificateId)
    if (!certificate) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      )
    }

    // Only allow the certificate owner or admins to download
    if (
      certificate.userId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }

    // Generate PDF if not already generated
    let pdfPath = certificate.certificateUrl
    if (!pdfPath) {
      pdfPath = await generateCertificatePdf(params.certificateId)
    }

    if (!pdfPath) {
      return NextResponse.json(
        { error: "Failed to generate certificate" },
        { status: 500 }
      )
    }

    const fullPath = join(process.cwd(), "public", pdfPath)
    if (!existsSync(fullPath)) {
      // PDF file doesn't exist yet (placeholder implementation)
      return NextResponse.json(
        {
          certificate: {
            id: certificate.id,
            courseName: certificate.course.title,
            userName: certificate.user.name,
            issuedAt: certificate.issuedAt,
            pdfUrl: pdfPath,
            status: "pending_generation",
          },
        },
        { status: 200 }
      )
    }

    const fileBuffer = await readFile(fullPath)
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="certificate-${certificate.id}.pdf"`,
      },
    })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch certificate" },
      { status: 500 }
    )
  }
}
