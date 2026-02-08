"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type MessageState = {
  type: "error" | "success"
  text: string
}

export function AuthModal() {
  const isMobile = useIsMobile()
  const {
    authModalOpen,
    authMode,
    closeAuthModal,
    setAuthMode,
    supabase,
  } = useAuth()

  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [signupName, setSignupName] = useState("")
  const [signupEmail, setSignupEmail] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<MessageState | null>(null)

  useEffect(() => {
    if (!authModalOpen) {
      setLoginEmail("")
      setLoginPassword("")
      setSignupName("")
      setSignupEmail("")
      setSignupPassword("")
      setMessage(null)
    }
  }, [authModalOpen])

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeAuthModal()
    }
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    })

    if (error) {
      setMessage({ type: "error", text: error.message })
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
  }

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    if (!signupName.trim()) {
      setMessage({ type: "error", text: "Please enter your name." })
      setIsSubmitting(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email: signupEmail.trim(),
      password: signupPassword,
      options: {
        data: {
          name: signupName.trim(),
        },
      },
    })

    if (error) {
      setMessage({ type: "error", text: error.message })
      setIsSubmitting(false)
      return
    }

    if (!data.session) {
      setMessage({
        type: "success",
        text: "Check your email to confirm your account.",
      })
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
  }

  const handleGoogle = async () => {
    setIsSubmitting(true)
    setMessage(null)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (error) {
      setMessage({ type: "error", text: error.message })
      setIsSubmitting(false)
    }
  }

  const headerCopy = useMemo(() => {
    return authMode === "login"
      ? {
          title: "Login Now!",
          description: "Welcome back! Please enter your details.",
        }
      : {
          title: "Create your account",
          description: "Join Okeyo Travel in a few steps.",
        }
  }, [authMode])

  const content = (
    <div
      className={cn(
        "flex flex-col gap-6 bg-white px-6 pb-8 pt-6 text-foreground",
        isMobile ? "rounded-t-[32px]" : "rounded-[32px]"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            {headerCopy.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {headerCopy.description}
          </p>
        </div>
        {isMobile ? (
          <DrawerClose asChild>
            <button
              type="button"
              className="text-muted-foreground text-sm hover:text-foreground"
            >
              Close
            </button>
          </DrawerClose>
        ) : null}
      </div>

      {authMode === "login" ? (
        <form className="flex flex-col gap-4" onSubmit={handleLogin}>
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@email.com"
              className="h-11 rounded-full bg-muted/60"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-11 rounded-full bg-muted/60"
              required
            />
          </div>
          {message ? (
            <div
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                message.type === "error"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-emerald-50 text-emerald-700"
              )}
            >
              {message.text}
            </div>
          ) : null}
          <Button
            type="submit"
            className="h-11 rounded-full bg-[#ff2566] text-white hover:bg-[#e0205a]"
            disabled={isSubmitting}
          >
            Log In
          </Button>
        </form>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSignup}>
          <div className="space-y-2">
            <Label htmlFor="signup-name">Name</Label>
            <Input
              id="signup-name"
              type="text"
              value={signupName}
              onChange={(event) => setSignupName(event.target.value)}
              placeholder="Your name"
              className="h-11 rounded-full bg-muted/60"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
              type="email"
              value={signupEmail}
              onChange={(event) => setSignupEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@email.com"
              className="h-11 rounded-full bg-muted/60"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <Input
              id="signup-password"
              type="password"
              value={signupPassword}
              onChange={(event) => setSignupPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="Create a password"
              className="h-11 rounded-full bg-muted/60"
              required
            />
          </div>
          {message ? (
            <div
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                message.type === "error"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-emerald-50 text-emerald-700"
              )}
            >
              {message.text}
            </div>
          ) : null}
          <Button
            type="submit"
            className="h-11 rounded-full bg-[#ff2566] text-white hover:bg-[#e0205a]"
            disabled={isSubmitting}
          >
            Create account
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {authMode === "login" ? "Don’t have an account?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
          className="font-semibold text-foreground hover:text-[#ff2566]"
        >
          {authMode === "login" ? "Sign Up" : "Log In"}
        </button>
      </p>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">Or continue with</span>
        <Separator className="flex-1" />
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleGoogle}
        className="h-11 rounded-full border border-input"
        disabled={isSubmitting}
      >
        Continue with Google
      </Button>
    </div>
  )

  if (isMobile) {
    return (
      <Drawer open={authModalOpen} onOpenChange={handleOpenChange}>
        <DrawerContent className="border-none bg-transparent px-0 pb-0">
          <DrawerHeader className="hidden">
            <DrawerTitle>{headerCopy.title}</DrawerTitle>
            <DrawerDescription>{headerCopy.description}</DrawerDescription>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={authModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[540px] border-none bg-transparent p-0 shadow-none">
        <DialogHeader className="sr-only">
          <DialogTitle>{headerCopy.title}</DialogTitle>
          <DialogDescription>{headerCopy.description}</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}
