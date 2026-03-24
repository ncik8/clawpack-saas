import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  console.log("Callback hit, code:", code, "error:", error)

  if (error) {
    console.error("OAuth error:", error)
    return NextResponse.redirect(new URL("/login?error=" + error, request.url))
  }

  if (code) {
    const supabase = await createClient()
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (sessionError) {
      console.error("Session exchange error:", sessionError)
    } else {
      console.log("Session exchanged successfully:", data.session?.user?.email)
    }
  }

  return NextResponse.redirect(new URL("/dashboard", request.url))
}
