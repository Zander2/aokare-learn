import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BookOpen, BarChart3, Award } from "lucide-react"

const features = [
  {
    icon: BookOpen,
    title: "Structured Learning",
    description:
      "Courses organized into modules and lessons, designed for progressive skill building.",
  },
  {
    icon: BarChart3,
    title: "Track Progress",
    description:
      "Monitor your learning journey with detailed progress tracking across all your courses.",
  },
  {
    icon: Award,
    title: "Earn Certificates",
    description:
      "Complete courses and pass quizzes to earn certificates that validate your skills.",
  },
]

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-stone-white">
      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-24">
        <h1 className="text-6xl font-semibold text-olive-deep">
          A<sup className="text-2xl">2</sup>
        </h1>
        <p className="mt-4 text-lg text-text-muted">
          Learn at your own pace
        </p>
        <Button className="mt-8" size="lg" render={<Link href="/courses" />}>
          Browse Courses
        </Button>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-stone-white px-4 py-20">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardContent className="flex flex-col items-center text-center">
                <div className="mb-4 flex size-12 items-center justify-center rounded bg-olive/10">
                  <feature.icon className="size-6 text-olive" />
                </div>
                <h3 className="text-sm font-semibold text-olive-deep">
                  {feature.title}
                </h3>
                <p className="mt-2 text-xs text-text-muted">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-stone-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-text-muted">
          &copy; 2024 Aokar&eacute; Learn. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
