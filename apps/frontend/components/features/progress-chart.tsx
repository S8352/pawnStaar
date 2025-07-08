import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

export function ProgressChart() {
  const metrics = [
    {
      name: "Tactical Rating",
      current: 1650,
      change: +45,
      progress: 75,
      trend: "up",
    },
    {
      name: "Opening Accuracy",
      current: 82,
      change: +8,
      progress: 82,
      trend: "up",
    },
    {
      name: "Blunder Rate",
      current: 12,
      change: -3,
      progress: 88,
      trend: "down",
    },
    {
      name: "Endgame Score",
      current: 68,
      change: 0,
      progress: 68,
      trend: "neutral",
    },
  ]

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getTrendColor = (trend: string, isBlunderRate = false) => {
    if (isBlunderRate) {
      return trend === "down" ? "text-green-600" : trend === "up" ? "text-red-600" : "text-gray-600"
    }
    return trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-gray-600"
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Progress</CardTitle>
          <CardDescription>Track your improvement across different chess skills</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {metrics.map((metric, index) => (
              <div key={index} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-pawn-primary">{metric.name}</h3>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(metric.trend)}
                    <span
                      className={`text-sm font-medium ${getTrendColor(metric.trend, metric.name === "Blunder Rate")}`}
                    >
                      {metric.change > 0 ? "+" : ""}
                      {metric.change}
                      {metric.name === "Opening Accuracy" || metric.name === "Endgame Score" ? "%" : ""}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Current: {metric.current}
                      {metric.name === "Opening Accuracy" || metric.name === "Endgame Score"
                        ? "%"
                        : metric.name === "Blunder Rate"
                          ? "%"
                          : ""}
                    </span>
                    <span className="text-gray-600">{metric.progress}%</span>
                  </div>
                  <Progress value={metric.progress} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
