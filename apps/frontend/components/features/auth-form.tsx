"use client"

import { useState } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Github, Chrome } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

/*
  The form and nothing else.

  It used to render its own Card, its own "Welcome to PawnStaar" title and its
  own min-h-screen centring wrapper — all of which duplicated what the login
  page around it was already doing. Framing is the page's job now.
*/

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
})

const registerSchema = z
  .object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type LoginFormValues = z.infer<typeof loginSchema>
type RegisterFormValues = z.infer<typeof registerSchema>

/** Errors persist inline rather than only in a toast that auto-dismisses. */
function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  )
}

export function AuthForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
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
    setFormError(null)
    const { error } = await supabase.auth.signInWithPassword(values)
    if (error) {
      setFormError(error.message)
      toast({ title: "Error signing in", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Signed in successfully!" })
      window.location.href = "/dashboard"
    }
    setIsSubmitting(false)
  }

  const onRegister = async (values: RegisterFormValues) => {
    setIsSubmitting(true)
    setFormError(null)
    const { error } = await supabase.auth.signUp(values)
    if (error) {
      setFormError(error.message)
      toast({ title: "Error signing up", description: error.message, variant: "destructive" })
    } else {
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      })
    }
    setIsSubmitting(false)
  }

  const handleOAuthLogin = async (provider: "github" | "google") => {
    setFormError(null)
    const { error } = await supabase.auth.signInWithOAuth({ provider })
    if (error) {
      setFormError(error.message)
      toast({
        title: `Error signing in with ${provider}`,
        description: error.message,
        variant: "destructive",
      })
    }
  }

  return (
    <div>
      <Tabs defaultValue="login" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Sign in</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <form onSubmit={loginForm.handleSubmit(onLogin)} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email" className="micro-label">
                Email
              </Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...loginForm.register("email")}
              />
              <FieldError message={loginForm.formState.errors.email?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password" className="micro-label">
                Password
              </Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                {...loginForm.register("password")}
              />
              <FieldError message={loginForm.formState.errors.password?.message} />
            </div>
            <Button type="submit" variant="solid" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="register">
          <form onSubmit={registerForm.handleSubmit(onRegister)} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-email" className="micro-label">
                Email
              </Label>
              <Input
                id="register-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...registerForm.register("email")}
              />
              <FieldError message={registerForm.formState.errors.email?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-password" className="micro-label">
                Password
              </Label>
              <Input
                id="register-password"
                type="password"
                autoComplete="new-password"
                {...registerForm.register("password")}
              />
              <FieldError message={registerForm.formState.errors.password?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="micro-label">
                Confirm password
              </Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                {...registerForm.register("confirmPassword")}
              />
              <FieldError message={registerForm.formState.errors.confirmPassword?.message} />
            </div>
            <Button type="submit" variant="solid" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      {formError && (
        <p role="alert" className="mt-4 border-l-2 border-destructive pl-3 text-sm text-destructive">
          {formError}
        </p>
      )}

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="micro-label bg-background px-3 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={() => handleOAuthLogin("github")}>
          <Github className="h-4 w-4" />
          GitHub
        </Button>
        <Button variant="outline" onClick={() => handleOAuthLogin("google")}>
          <Chrome className="h-4 w-4" />
          Google
        </Button>
      </div>
    </div>
  )
}
