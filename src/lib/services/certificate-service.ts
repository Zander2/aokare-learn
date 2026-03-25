import { prisma } from "@/lib/prisma"
import fs from "fs"
import path from "path"
import React from "react"
import * as ReactPDF from "@react-pdf/renderer"
import { CertificatePdf } from "./certificate-pdf"

export async function issueCertificate(userId: string, courseId: string) {
  return prisma.certificate.create({
    data: {
      userId,
      courseId,
    },
  })
}

export async function getCertificatesByUser(userId: string) {
  return prisma.certificate.findMany({
    where: { userId },
    include: {
      course: {
        select: { title: true, slug: true },
      },
    },
    orderBy: { issuedAt: "desc" },
  })
}

export async function getCertificate(userId: string, courseId: string) {
  return prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
    include: {
      course: { select: { title: true, slug: true } },
      user: { select: { name: true, email: true } },
    },
  })
}

export async function getCertificateById(id: string) {
  return prisma.certificate.findUnique({
    where: { id },
    include: {
      course: { select: { title: true, slug: true } },
      user: { select: { name: true, email: true } },
    },
  })
}

export async function generateCertificatePdf(
  certificateId: string
): Promise<string | null> {
  const certificate = await getCertificateById(certificateId)
  if (!certificate) return null

  const userName = certificate.user.name ?? certificate.user.email
  const courseTitle = certificate.course.title

  const element = React.createElement(CertificatePdf, {
    userName,
    courseTitle,
    issuedAt: certificate.issuedAt,
    certificateId: certificate.id,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as React.ReactElement<any>

  const pdfBuffer = await ReactPDF.renderToBuffer(element)

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "certificates")
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  const filePath = path.join(uploadsDir, `${certificateId}.pdf`)
  fs.writeFileSync(filePath, pdfBuffer)

  const publicUrl = `/uploads/certificates/${certificateId}.pdf`
  await prisma.certificate.update({
    where: { id: certificateId },
    data: { certificateUrl: publicUrl },
  })

  return publicUrl
}
