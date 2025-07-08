import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, TrendingUp, Gamepad2, MessageCircle, BookOpen, Shield } from "lucide-react"

export function Features() {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Analysis",
      description:
        "Advanced chess engine analyzes every move, identifying blunders, mistakes, and missed opportunities in your games.",
    },
    {
      icon: TrendingUp,
      title: "Progress Tracking",
      description:
        "Visual reports show your improvement over time across different skill areas like tactics, openings, and endgames.",
    },
    {
      icon: Gamepad2,
      title: "Personalized Training",
      description: "Daily workouts tailored to your weaknesses, featuring puzzles generated from your own games.",
    },
    {
      icon: MessageCircle,
      title: "Community Features",
      description: "Connect with friends, share games, and learn from a community of chess enthusiasts.",
    },
    {
      icon: BookOpen,
      title: "Curated Lessons",
      description: "Access a library of lessons created by Grandmasters, recommended based on your specific needs.",
    },
    {
      icon: Shield,
      title: "Coach Integration",
      description: "Share your progress and analysis with your chess coach for more effective lessons.",
    },
  ]

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-pawn-primary mb-4">Everything You Need to Improve</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our comprehensive platform combines cutting-edge AI technology with proven chess training methods
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-gray-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="bg-pawn-accent/10 p-3 rounded-lg w-fit mb-4">
                  <feature.icon className="h-6 w-6 text-pawn-accent" />
                </div>
                <CardTitle className="text-pawn-primary">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
