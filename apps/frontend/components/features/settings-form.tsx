"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { User, Mail, Camera, LinkIcon, Search, CheckCircle, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ProfilePreview {
  username: string
  avatar_url?: string
  rating?: number
  verified: boolean
}

export function SettingsForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState<{lichess: boolean, chess_com: boolean}>({
    lichess: false,
    chess_com: false
  })
  const [searchResults, setSearchResults] = useState<{
    lichess?: ProfilePreview,
    chess_com?: ProfilePreview
  }>({})
  const [searchInputs, setSearchInputs] = useState({
    lichess: '',
    chess_com: ''
  })
  const { toast } = useToast()

  const searchProfile = async (platform: 'lichess' | 'chess_com', username: string) => {
    if (!username.trim()) return

    setSearchLoading(prev => ({ ...prev, [platform]: true }))
    
    try {
      const response = await fetch('/api/users/search-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, username })
      })
      
      if (response.ok) {
        const profileData = await response.json()
        setSearchResults(prev => ({ ...prev, [platform]: profileData }))
      } else {
        setSearchResults(prev => ({ ...prev, [platform]: undefined }))
        toast({
          title: "Profile not found",
          description: `No ${platform} profile found for username: ${username}`,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Search failed",
        description: "Failed to search for profile. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSearchLoading(prev => ({ ...prev, [platform]: false }))
    }
  }

  const linkAccount = async (platform: 'lichess' | 'chess_com', username: string) => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/users/link-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, username })
      })
      
      if (response.ok) {
        toast({
          title: "Account linked",
          description: `${platform} account linked successfully. Games are being imported.`,
        })
        // Refresh user data
      } else {
        const error = await response.json()
        toast({
          title: "Link failed",
          description: error.detail || "Failed to link account",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Link failed",
        description: "Failed to link account. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const ProfileSearchCard = ({ 
    platform, 
    displayName, 
    color, 
    connected = false 
  }: { 
    platform: 'lichess' | 'chess_com'
    displayName: string
    color: string
    connected?: boolean
  }) => {
    const result = searchResults[platform]
    const isSearching = searchLoading[platform]
    
    return (
      <div className="space-y-3 p-4 border rounded-lg">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 ${color} rounded flex items-center justify-center`}>
            <span className="text-white text-xs font-bold">
              {displayName.charAt(0)}
            </span>
          </div>
          <div>
            <p className="font-medium">{displayName}</p>
            {connected && <p className="text-sm text-green-600">Connected</p>}
          </div>
        </div>
        
        {!connected && (
          <>
            <div className="flex gap-2">
              <Input
                placeholder={`Enter ${displayName} username`}
                value={searchInputs[platform]}
                onChange={(e) => setSearchInputs(prev => ({ 
                  ...prev, 
                  [platform]: e.target.value 
                }))}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    searchProfile(platform, searchInputs[platform])
                  }
                }}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => searchProfile(platform, searchInputs[platform])}
                disabled={isSearching || !searchInputs[platform].trim()}
              >
                {isSearching ? (
                  <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {result && (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={result.avatar_url} />
                    <AvatarFallback>{result.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{result.username}</p>
                    {result.rating && (
                      <p className="text-sm text-gray-600">Rating: {result.rating}</p>
                    )}
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <Button
                  size="sm"
                  onClick={() => linkAccount(platform, result.username)}
                  disabled={isLoading}
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Link Account
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>Update your profile information and connect chess accounts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile section remains the same */}
        
        <Separator />

        <div className="space-y-4">
          <h3 className="font-semibold text-pawn-primary">Chess Platform Accounts</h3>
          <p className="text-sm text-gray-600">
            Connect your chess accounts to import games and sync your progress
          </p>

          <div className="space-y-4">
            <ProfileSearchCard
              platform="chess_com"
              displayName="Chess.com"
              color="bg-green-500"
            />
            
            <ProfileSearchCard
              platform="lichess"
              displayName="Lichess"
              color="bg-blue-500"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
