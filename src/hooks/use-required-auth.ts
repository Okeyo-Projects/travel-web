import { useCallback } from "react"
import type { AuthMode } from "@/providers/auth-provider"
import { useAuth } from "@/hooks/use-auth"

type RequireAuthOptions = {
  mode?: AuthMode
}

export function useRequiredAuth() {
  const { user, openAuthModal } = useAuth()

  const requireAuth = useCallback(
    (action: () => void | Promise<void>, options?: RequireAuthOptions) => {
      if (user) {
        return action()
      }

      openAuthModal({
        mode: options?.mode ?? "login",
        onAuthed: action,
      })

      return undefined
    },
    [user, openAuthModal]
  )

  return {
    requireAuth,
    isAuthed: Boolean(user),
    user,
  }
}
