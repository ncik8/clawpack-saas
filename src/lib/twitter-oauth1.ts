// OAuth 1.0a signing utility for Twitter API v1.1 requests (like media upload)

const TwitterAPIKey = process.env.TWITTER_CONSUMER_KEY!;
const TwitterAPISecret = process.env.TWITTER_CONSUMER_SECRET!;

interface OAuthParams {
  [key: string]: string;
}

export function generateOAuth1Signature(
  method: string,
  url: string,
  params: Record<string, string>,
  oauthTokenSecret?: string
): string {
  // Create signing key
  const signingKey = `${encodeURIComponent(TwitterAPISecret)}&${oauthTokenSecret ? encodeURIComponent(oauthTokenSecret) : ''}`;

  // Create parameter string
  const sortedParams = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  // Create signature base string
  const signatureBase = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;

  // Generate HMAC-SHA1 signature
  const crypto = require('crypto');
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBase)
    .digest('base64');

  return signature;
}

export function createOAuth1Header(
  method: string,
  url: string,
  params: Record<string, string>,
  oauthTokenSecret?: string
): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).substring(2);

  const oauthParams: OAuthParams = {
    oauth_consumer_key: TwitterAPIKey,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: '1.0',
  };

  if (params.oauth_token) {
    oauthParams.oauth_token = params.oauth_token;
    delete params.oauth_token;
  }

  // Generate signature
  const signature = generateOAuth1Signature(method, url, { ...params, ...oauthParams }, oauthTokenSecret);
  oauthParams.oauth_signature = signature;

  // Create auth header
  const authHeader = Object.entries(oauthParams)
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(', ');

  return `OAuth ${authHeader}`;
}
