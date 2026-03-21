import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Auth helpers
export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name }
    }
  })
  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Business helpers
export async function createBusiness(userId: string, businessData: {
  name: string
  type: string
  location?: string
}) {
  const { data, error } = await supabase
    .from('businesses')
    .insert({
      ...businessData,
      user_id: userId
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getBusiness(businessId: string) {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single()
  
  if (error) throw error
  return data
}

// Social accounts
export async function connectSocialAccount(businessId: string, platform: string, accessToken: string, platformUserId: string) {
  const { data, error } = await supabase
    .from('social_accounts')
    .insert({
      business_id: businessId,
      platform,
      access_token: accessToken,
      platform_user_id: platformUserId
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}
