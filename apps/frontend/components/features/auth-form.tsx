"use client"

import { useState } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Github, Chrome } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
})

const registerSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

type LoginFormValues = z.infer<typeof loginSchema>
type RegisterFormValues = z.infer<typeof registerSchema>

export function AuthForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  })

  const onLogin = async (values: LoginFormValues) => {
    setIsSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword(values)
    if (error) {
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Signed in successfully!",
      })
      window.location.href = "/dashboard"
    }
    setIsSubmitting(false)
  }

  const onRegister = async (values: RegisterFormValues) => {
    setIsSubmitting(true)
    const { error } = await supabase.auth.signUp(values)
    if (error) {
      toast({
        title: "Error signing up",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      })
    }
    setIsSubmitting(false)
  }

  const handleOAuthLogin = async (provider: 'github' | 'google') => {
    const { error } = await supabase.auth.signInWithOAuth({ provider })
    if (error) {
      toast({
        title: `Error signing in with ${provider}`,
        description: error.message,
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to PawnStaar</CardTitle>
          <CardDescription>Sign in to your account or create a new one</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" placeholder="m@example.com" {...loginForm.register("email")} />
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-red-500">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input id="login-password" type="password" {...loginForm.register("password")} />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-red-500">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input id="register-email" type="email" placeholder="m@example.com" {...registerForm.register("email")} />
                  {registerForm.formState.errors.email && (
                    <p className="text-sm text-red-500">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <Input id="register-password" type="password" {...registerForm.register("password")} />
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-red-500">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input id="confirm-password" type="password" {...registerForm.register("confirmPassword")} />
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-500">{registerForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                Or continue with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" onClick={() => handleOAuthLogin('github')}>
              <Github className="mr-2 h-4 w-4" />
              GitHub
            </Button>
            <Button variant="outline" onClick={() => handleOAuthLogin('google')}>
              <Chrome className="mr-2 h-4 w-4" />
              Google
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
