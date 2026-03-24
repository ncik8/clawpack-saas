import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const error = requestUrl.searchParams.get("error")

  console.log("=== CALLBACK START ===")
  console.log("Full URL:", requestUrl.toString())
  console.log("Code:", code)
  console.log("Error:", error)

  if (error) {
    console.log("OAuth error, redirecting to login")
    return NextResponse.redirect(new URL("/login?error=" + error, request.url))
  }

  if (!code) {
    console.log("No code received, redirecting to login")
    return NextResponse.redirect(new URL("/login?error=no_code", request.url))
  }

  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                httpOnly: options?.httpOnly ?? true,
                secure: options?.secure ?? true,
                sameSite: (options?.sameSite as any) ?? 'lax',
                path: '/',
                maxAge: options?.maxAge,
              })
            )
          } catch (e) {
            console.error("Cookie set error:", e)
          }
        },
      },
    }
  )

  console.log("Exchanging code for session...")
  const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
  
  if (sessionError) {
    console.error("Session error:", sessionError.message)
    return NextResponse.redirect(new URL("/login?error=" + sessionError.message, request.url))
  }
  
  console.log("Session exchanged! User:", data.user?.email)
  console.log("=== CALLBACK END ===")

  return NextResponse.redirect(new URL("/dashboard", request.url))
}
