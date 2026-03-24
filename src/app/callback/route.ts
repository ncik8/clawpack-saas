import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const error = requestUrl.searchParams.get("error")

  if (error) {
    return NextResponse.redirect(new URL("/login?error=" + error, request.url))
  }

  let supabaseResponse = NextResponse.redirect(new URL("/dashboard", request.url))

  if (code) {
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
            } catch {
              // Ignore errors
            }
          },
        },
      }
    )

    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!sessionError) {
      console.log("Session exchanged successfully")
      // Create new response with redirect and ensure cookies are carried
      supabaseResponse = NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  return supabaseResponse
}
