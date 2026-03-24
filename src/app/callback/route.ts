import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const error = requestUrl.searchParams.get("error")

  // Create response FIRST with the redirect
  let supabaseResponse = NextResponse.redirect(new URL("/dashboard", request.url), 307)

  if (error) {
    return NextResponse.redirect(new URL("/login?error=" + error, request.url))
  }

  if (!code) {
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
            // IMPORTANT: Set cookies on supabaseResponse, not cookieStore
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, {
                httpOnly: options?.httpOnly ?? true,
                secure: options?.secure ?? true,
                sameSite: (options?.sameSite as any) ?? 'lax',
                path: options?.path ?? '/',
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

  const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
  
  if (sessionError) {
    return NextResponse.redirect(new URL("/login?error=" + sessionError.message, request.url))
  }

  return supabaseResponse
}
