import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { queryClient } from "@/lib/query-client"
import { claimGuestProgress } from "@/features/gamification/services/gamification-repository"
import { getAuthRedirectUrl } from "@/features/auth/auth-redirect"
import {
  completeAuthCallback as exchangeAuthCallback,
  type AuthCallbackResult,
} from "@/features/auth/auth-callback"

type AuthContextValue = {
  session: Session | null
  user: User | null
  isLoading: boolean
  signInWithEmail: (email: string, returnTo?: string | null) => Promise<void>
  completeAuthCallback: (url: string) => Promise<AuthCallbackResult>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const completedMerges = useRef(new Set<string>())
  const pendingMerges = useRef(new Map<string, Promise<void>>())

  const ensureGuestProgressClaimed = useCallback((userId: string): Promise<void> => {
    if (completedMerges.current.has(userId)) return Promise.resolve()
    const pending = pendingMerges.current.get(userId)
    if (pending) return pending

    const merge = (async () => {
      try {
        const claimResult = await claimGuestProgress()
        if (claimResult) await queryClient.invalidateQueries({ queryKey: ["gamification"] })
        completedMerges.current.add(userId)
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            "Guest progress merge is pending",
            error instanceof Error ? error.message : "unknown error"
          )
        }
      } finally {
        pendingMerges.current.delete(userId)
      }
    })()

    pendingMerges.current.set(userId, merge)
    return merge
  }, [])

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data: sessionResponse }) => {
      if (!isMounted) return
      setSession(sessionResponse.session)
      setIsLoading(false)
      if (sessionResponse.session?.user.id) {
        void ensureGuestProgressClaimed(sessionResponse.session.user.id)
      }
    })

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setIsLoading(false)
      if (nextSession?.user.id) void ensureGuestProgressClaimed(nextSession.user.id)
    })

    return () => {
      isMounted = false
      authSubscription.subscription.unsubscribe()
    }
  }, [ensureGuestProgressClaimed])

  const signInWithEmail = useCallback(async (email: string, returnTo?: string | null) => {
    const emailRedirectTo = getAuthRedirectUrl(returnTo)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo },
    })
    if (error) throw error
  }, [])

  const finishAuthCallback = useCallback(
    async (url: string) => {
      const callbackResult = await exchangeAuthCallback(url)
      setSession(callbackResult.session)
      await ensureGuestProgressClaimed(callbackResult.session.user.id)
      return callbackResult
    },
    [ensureGuestProgressClaimed]
  )

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      signInWithEmail,
      completeAuthCallback: finishAuthCallback,
      signOut,
    }),
    [finishAuthCallback, isLoading, session, signInWithEmail, signOut]
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const contextValue = useContext(AuthContext)
  if (!contextValue) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return contextValue
}
