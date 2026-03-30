// OAuth 1.0a signing utility for Twitter API v1.1 requests

const TwitterAPIKey = process.env.TWITTER_CONSUMER_KEY!;
const TwitterAPISecret = process.env.TWITTER_CONSUMER_SECRET!;

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function baseString(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join('&');
}

export function createOAuth1Header(
  method: string,
  url: string,
  oauthToken: string,
  oauthTokenSecret: string
): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).substring(2);

  const params: Record<string, string> = {
    oauth_consumer_key: TwitterAPIKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: oauthToken,
    oauth_version: '1.0',
  };

  // Create signature base string
  const signatureBase = `${method}&${percentEncode(url)}&${percentEncode(baseString(params))}`;

  // Create signing key
  const signingKey = `${percentEncode(TwitterAPISecret)}&${oauthTokenSecret ? percentEncode(oauthTokenSecret) : ''}`;

  // Generate HMAC-SHA1 signature
  const crypto = require('crypto');
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBase)
    .digest('base64');

  params.oauth_signature = signature;

  // Create Authorization header
  const authHeader = Object.entries(params)
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
    .join(', ');

  return `OAuth ${authHeader}`;
}
