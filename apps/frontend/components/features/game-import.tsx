"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, LinkIcon, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function GameImport({ onImportSuccess }: { onImportSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false)
  const [pgn, setPgn] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [taskIds, setTaskIds] = useState<string[]>([])
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUserId(session.user.id)
      }
    }
    getUser()
  }, [supabase])

  useEffect(() => {
    if (taskIds.length === 0) return

    const interval = setInterval(async () => {
      const statuses = await Promise.all(
        taskIds.map(async (id) => {
          const res = await fetch(`http://localhost:8000/import/task-status/${id}`)
          return res.json()
        })
      )

      const completedTasks = statuses.filter(s => s.status === 'SUCCESS' || s.status === 'FAILURE')
      if (completedTasks.length > 0) {
        toast({
          title: "Analysis Complete",
          description: `${completedTasks.length} game(s) have been analyzed.`,
        })
        onImportSuccess()
      }
      
      const remainingTaskIds = statuses
        .filter(s => s.status !== 'SUCCESS' && s.status !== 'FAILURE')
        .map(s => s.task_id)
      
      setTaskIds(remainingTaskIds)

      if (remainingTaskIds.length === 0) {
        clearInterval(interval)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [taskIds, toast, onImportSuccess])

  const handleSync = async (platform: string) => {
    if (!userId) {
      toast({ title: "Authentication Error", description: "Could not identify user.", variant: "destructive" })
      return
    }
    setIsLoading(true)
    // In a real app, you'd get the username from the user's profile
    const username = "testuser" // Placeholder
    try {
      const response = await fetch(`http://localhost:8000/import/${platform.toLowerCase()}/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || "Failed to sync games")
      setTaskIds(data.task_ids)
      toast({
        title: "Sync Started",
        description: `Importing latest games from ${platform}. We'll notify you when analysis is complete.`,
      })
    } catch (error) {
      toast({
        title: "Error syncing games",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
    setIsLoading(false)
  }

  const handlePGNUpload = async () => {
    if (!pgn.trim()) {
      toast({ title: "PGN content is empty", description: "Please paste your PGN content.", variant: "destructive" })
      return
    }
    if (!userId) {
      toast({ title: "Authentication Error", description: "Could not identify user.", variant: "destructive" })
      return
    }
    setIsLoading(true)
    try {
      const blob = new Blob([pgn], { type: 'application/x-chess-pgn' });
      const file = new File([blob], "upload.pgn", { type: "application/x-chess-pgn" });

      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`http://localhost:8000/import/pgn/${userId}`, {
        method: "POST",
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || "Failed to upload PGN")
      setTaskIds([data.task_id])
      toast({
        title: "PGN Uploaded",
        description: "Your game is queued for analysis. We'll notify you when it's ready.",
      })
      setPgn("")
    } catch (error) {
      toast({
        title: "Error uploading PGN",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
    setIsLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-pawn-accent" />
          Import Games
        </CardTitle>
        <CardDescription>Sync your games from chess platforms or upload PGN files</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sync" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sync">Sync Accounts</TabsTrigger>
            <TabsTrigger value="upload">Upload PGN</TabsTrigger>
          </TabsList>

          <TabsContent value="sync" className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-700 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">C</span>
                  </div>
                  <div>
                    <p className="font-medium">Chess.com</p>
                    <p className="text-sm text-muted-foreground">Connected</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleSync("Chess.com")} disabled={isLoading}>
                  {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Sync
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-700 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">L</span>
                  </div>
                  <div>
                    <p className="font-medium">Lichess</p>
                    <p className="text-sm text-muted-foreground">Not connected</p>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Connect
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="pgn">PGN Content</Label>
                <Textarea
                  id="pgn"
                  placeholder="Paste your PGN here..."
                  className="min-h-[120px] mt-2"
                  value={pgn}
                  onChange={(e) => setPgn(e.target.value)}
                />
              </div>
              {/* Was `bg-pawn-primary`, an undefined colour. tailwind-merge
                  stripped the variant's real background in its favour, leaving
                  a fully transparent button. */}
              <Button onClick={handlePGNUpload} variant="solid" className="w-full" disabled={isLoading}>
                {isLoading ? <Upload className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload & Analyze
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
