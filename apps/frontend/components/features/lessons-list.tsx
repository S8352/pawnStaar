import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Clock, Star, Play } from "lucide-react"

export function LessonsList() {
  const lessons = [
    {
      title: "Tactical Patterns: Pins and Skewers",
      description: "Master the fundamental tactical motifs that appear in your games",
      duration: "15 min",
      difficulty: "Beginner",
      rating: 4.8,
      recommended: true,
    },
    {
      title: "Sicilian Defense: Dragon Variation",
      description: "Improve your opening play based on your recent games",
      duration: "25 min",
      difficulty: "Intermediate",
      rating: 4.9,
      recommended: true,
    },
    {
      title: "Endgame Essentials: Rook Endings",
      description: "Convert your advantages in rook endgames",
      duration: "20 min",
      difficulty: "Intermediate",
      rating: 4.7,
      recommended: false,
    },
    {
      title: "Time Management in Blitz",
      description: "Optimize your time usage in fast games",
      duration: "12 min",
      difficulty: "Advanced",
      rating: 4.6,
      recommended: false,
    },
  ]

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return "bg-green-100 text-green-800"
      case "Intermediate":
        return "bg-yellow-100 text-yellow-800"
      case "Advanced":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-accent" />
            Recommended Lessons
          </CardTitle>
          <CardDescription>Curated lessons based on your game analysis and skill level</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {lessons.map((lesson, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-primary">{lesson.title}</h3>
                    {lesson.recommended && (
                      <Badge variant="secondary" className="bg-accent/10 text-accent">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{lesson.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {lesson.duration}
                    </div>
                    <Badge variant="outline" className={getDifficultyColor(lesson.difficulty)}>
                      {lesson.difficulty}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-current text-yellow-500" />
                      {lesson.rating}
                    </div>
                  </div>
                </div>
                <Button size="sm">
                  Start Lesson
                  <Play className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
