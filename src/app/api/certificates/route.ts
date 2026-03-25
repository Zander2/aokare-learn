import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getCertificatesByUser } from "@/lib/services/certificate-service"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const certificates = await getCertificatesByUser(session.user.id)
    return NextResponse.json({ certificates })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch certificates" },
      { status: 500 }
    )
  }
}
