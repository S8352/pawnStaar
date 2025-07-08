import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Trophy, Target, TrendingUp } from "lucide-react"
import type { User } from "@/types"

interface ProfileHeaderProps {
  user: User
}

export function ProfileHeader({ user }: ProfileHeaderProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
            <AvatarFallback className="text-2xl">{user.name.charAt(0)}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
              <h1 className="text-2xl font-bold text-pawn-primary">{user.name}</h1>
              <Badge variant="secondary" className="w-fit">
                {user.subscription} Member
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-pawn-accent" />
                <div>
                  <p className="text-sm text-gray-600">Current Rating</p>
                  <p className="font-semibold">{user.rating}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-pawn-accent" />
                <div>
                  <p className="text-sm text-gray-600">Games Analyzed</p>
                  <p className="font-semibold">{user.gamesAnalyzed}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-pawn-accent" />
                <div>
                  <p className="text-sm text-gray-600">Improvement</p>
                  <p className="font-semibold text-green-600">+{user.ratingGain}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
