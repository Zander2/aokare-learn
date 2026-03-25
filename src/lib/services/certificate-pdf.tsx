import React from "react"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    padding: 60,
    fontFamily: "Helvetica",
  },
  outerBorder: {
    border: "3px solid #6B6B2A",
    padding: 40,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  innerBorder: {
    border: "1px solid #6B6B2A",
    padding: 30,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  logoText: {
    fontSize: 36,
    fontFamily: "Helvetica-Bold",
    color: "#6B6B2A",
    marginBottom: 4,
    textAlign: "center",
  },
  brandName: {
    fontSize: 12,
    color: "#6B6B2A",
    letterSpacing: 4,
    textAlign: "center",
    marginBottom: 32,
  },
  certificateTitle: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: "#2D2D2D",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#555555",
    textAlign: "center",
    marginBottom: 32,
  },
  recipientName: {
    fontSize: 30,
    fontFamily: "Helvetica-BoldOblique",
    color: "#6B6B2A",
    textAlign: "center",
    marginBottom: 16,
  },
  completionText: {
    fontSize: 13,
    color: "#555555",
    textAlign: "center",
    marginBottom: 12,
  },
  courseTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#2D2D2D",
    textAlign: "center",
    marginBottom: 32,
  },
  divider: {
    borderBottom: "1px solid #6B6B2A",
    width: 200,
    marginBottom: 32,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 16,
  },
  metaBlock: {
    alignItems: "center",
    flex: 1,
  },
  metaLabel: {
    fontSize: 9,
    color: "#999999",
    letterSpacing: 1,
    marginBottom: 2,
    textAlign: "center",
  },
  metaValue: {
    fontSize: 11,
    color: "#2D2D2D",
    textAlign: "center",
  },
})

interface CertificatePdfProps {
  userName: string
  courseTitle: string
  issuedAt: Date
  certificateId: string
}

export function CertificatePdf({
  userName,
  courseTitle,
  issuedAt,
  certificateId,
}: CertificatePdfProps) {
  const formattedDate = issuedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.outerBorder}>
          <View style={styles.innerBorder}>
            <Text style={styles.logoText}>A²</Text>
            <Text style={styles.brandName}>AOKARÉ LEARN</Text>

            <Text style={styles.certificateTitle}>Certificate of Completion</Text>
            <Text style={styles.subtitle}>This is to certify that</Text>

            <Text style={styles.recipientName}>{userName}</Text>

            <Text style={styles.completionText}>has successfully completed the course</Text>

            <Text style={styles.courseTitle}>{courseTitle}</Text>

            <View style={styles.divider} />

            <View style={styles.metaRow}>
              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>ISSUED ON</Text>
                <Text style={styles.metaValue}>{formattedDate}</Text>
              </View>
              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>CERTIFICATE ID</Text>
                <Text style={styles.metaValue}>{certificateId}</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
