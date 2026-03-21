import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

// Create a Stripe Connect account for a business
export async function createConnectAccount(email: string, businessName: string) {
  const account = await stripe.accounts.create({
    type: 'express',
    email,
    business_type: 'individual',
    business_profile: {
      name: businessName,
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  })
  
  return account
}

// Create onboarding link for Stripe Connect
export async function createAccountLink(accountId: string, returnUrl: string, refreshUrl: string) {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  })
  
  return accountLink
}

// Create payment intent
export async function createPayment(amount: number, currency: string, accountId: string, metadata: Record<string, string>) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    transfer_data: {
      destination: accountId,
    },
    metadata,
  })
  
  return paymentIntent
}

// Charge a platform fee
export async function createCharge(amount: number, currency: string, connectedAccountId: string, platformFee: number) {
  // Create payment intent with transfer
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    transfer_data: {
      destination: connectedAccountId,
      amount: platformFee, // This is the platform's fee
    },
  })
  
  return paymentIntent
}

// Webhook handler
export async function constructWebhookEvent(payload: string | Buffer, signature: string) {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}
