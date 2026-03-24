import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  console.log("CALLBACK HIT")

  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  console.log("Auth code:", code)

  try {
    if (code) {
      const cookieStore = cookies()

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name) {
              return cookieStore.get(name)?.value
            },
            set(name, value, options) {
              cookieStore.set({ name, value, ...options })
            },
            remove(name, options) {
              cookieStore.set({ name, value: "", ...options })
            },
          },
        }
      )

      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      console.log("Session result:", data)
      console.log("Session error:", error)
    }
  } catch (err) {
    console.error("Callback error:", err)
  }

  console.log("Redirecting to dashboard")

  return NextResponse.redirect(new URL("/dashboard", request.url))
}
