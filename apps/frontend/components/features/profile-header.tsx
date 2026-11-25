import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trophy, Target, TrendingUp } from "lucide-react"
import type { User } from "@/types"

interface ProfileHeaderProps {
  user: User
}

const STATS = [
  { icon: Trophy, label: "Current rating", key: "rating" },
  { icon: Target, label: "Games analysed", key: "gamesAnalyzed" },
] as const

export function ProfileHeader({ user }: ProfileHeaderProps) {
  return (
    <header className="rule flex flex-col gap-8 pb-8 pt-2 md:flex-row md:items-end md:justify-between">
      <div className="flex items-center gap-5">
        <Avatar className="h-16 w-16">
          <AvatarImage src={user.avatar || "/placeholder-user.jpg"} alt="" />
          <AvatarFallback className="font-display text-xl">
            {user.name.charAt(0)}
          </AvatarFallback>
        </Avatar>

        <div>
          <h1 className="font-display text-display-sm leading-none">{user.name}</h1>
        </div>
      </div>

      {/* Stats read as a row of figures rather than icon-and-label pairs, so
          the numbers themselves carry the hierarchy. */}
      <dl className="flex flex-wrap gap-x-10 gap-y-5">
        {STATS.map((stat) => (
          <div key={stat.key}>
            <dt className="micro-label flex items-center gap-2 text-muted-foreground">
              <stat.icon className="h-4 w-4 text-gold-text" strokeWidth={1.5} />
              {stat.label}
            </dt>
            <dd className="mt-2 font-display text-2xl tabular-nums">{user[stat.key]}</dd>
          </div>
        ))}
        <div>
          <dt className="micro-label flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-gold-text" strokeWidth={1.5} />
            Improvement
          </dt>
          <dd className="mt-2 font-display text-2xl tabular-nums text-success">
            +{user.ratingGain}
          </dd>
        </div>
      </dl>
    </header>
  )
}
