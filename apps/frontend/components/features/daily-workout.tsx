import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Target, Zap, BookOpen, Play } from "lucide-react"

export function DailyWorkout() {
  const workoutItems = [
    {
      icon: Target,
      title: "Personalized Puzzles",
      description: "Solve 5 puzzles based on your recent mistakes",
      progress: 60,
      total: 5,
      completed: 3,
    },
    {
      icon: BookOpen,
      title: "Opening Review",
      description: "Practice your Sicilian Defense variations",
      progress: 0,
      total: 3,
      completed: 0,
    },
    {
      icon: Zap,
      title: "Blunder Prevention",
      description: "Avoid tactical mistakes in complex positions",
      progress: 100,
      total: 2,
      completed: 2,
    },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-pawn-accent" />
            Today's Workout
          </CardTitle>
          <CardDescription>Complete your personalized training to improve your weakest areas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workoutItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4 flex-1">
                  <div className="bg-pawn-accent/10 p-2 rounded-lg">
                    <item.icon className="h-5 w-5 text-pawn-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-pawn-primary">{item.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                    <div className="flex items-center gap-2">
                      <Progress value={item.progress} className="flex-1 max-w-[200px]" />
                      <span className="text-sm text-gray-600">
                        {item.completed}/{item.total}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={item.progress === 100 ? "outline" : "default"}
                  className={item.progress === 100 ? "" : "bg-pawn-primary hover:bg-pawn-primary/90"}
                >
                  {item.progress === 100 ? "Review" : "Start"}
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
