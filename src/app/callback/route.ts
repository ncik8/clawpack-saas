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

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", request.url))
  }

  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
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
          } catch (e) { console.error("Cookie set error:", e) }
        },
      },
    }
  )

  const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
  
  if (sessionError) {
    return NextResponse.redirect(new URL("/login?error=" + sessionError.message, request.url))
  }

  // Return HTML that redirects client-side
  return new NextResponse(
    `<!DOCTYPE html>
    <html>
      <head>
        <meta http-equiv="refresh" content="0;url=/dashboard" />
        <title>Signing in...</title>
      </head>
      <body>
        <p>Signing you in... <a href="/dashboard">Click here if not redirected</a></p>
        <script>window.location.href='/dashboard'</script>
      </body>
    </html>`,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    }
  )
}
