"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DailyWorkout } from "./daily-workout"
import { ProgressChart } from "./progress-chart"
import { LessonsList } from "./lessons-list"
import { GameImport } from "./game-import"
import { GameList } from "./game-list"

export function DashboardTabs() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleImportSuccess = () => {
    setRefreshKey(oldKey => oldKey + 1)
  }

  return (
    <Tabs defaultValue="workout" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="workout">Daily Workout</TabsTrigger>
        <TabsTrigger value="progress">Progress</TabsTrigger>
        <TabsTrigger value="lessons">Lessons</TabsTrigger>
        <TabsTrigger value="games">Games</TabsTrigger>
      </TabsList>

      <TabsContent value="workout" className="mt-6">
        <DailyWorkout />
      </TabsContent>

      <TabsContent value="progress" className="mt-6">
        <ProgressChart />
      </TabsContent>

      <TabsContent value="lessons" className="mt-6">
        <LessonsList />
      </TabsContent>

      <TabsContent value="games" className="mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <GameImport onImportSuccess={handleImportSuccess} />
          </div>
          <div className="lg:col-span-2">
            <GameList refreshKey={refreshKey} />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
