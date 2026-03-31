import * as crypto from 'crypto';

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

function generateTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

function normalizeUrl(input: string): string {
  const url = new URL(input);
  url.hash = '';
  url.search = '';
  if (
    (url.protocol === 'https:' && url.port === '443') ||
    (url.protocol === 'http:' && url.port === '80')
  ) {
    url.port = '';
  }
  return url.toString();
}

function buildOAuthParams({
  consumerKey,
  accessToken,
}: {
  consumerKey: string;
  accessToken?: string;
}) {
  const params: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: generateNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: generateTimestamp(),
    oauth_version: '1.0',
  };

  if (accessToken) {
    params.oauth_token = accessToken;
  }

  return params;
}

function toAuthHeader(oauthParams: Record<string, string>) {
  return (
    'OAuth ' +
    Object.keys(oauthParams)
      .sort()
      .map((key) => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
      .join(', ')
  );
}

// For multipart/form-data requests - signature ONLY OAuth params, no body
export function buildOAuthHeaderMultipart({
  method,
  url,
  consumerKey,
  consumerSecret,
  accessToken,
  accessTokenSecret,
}: {
  method: string;
  url: string;
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}) {
  const oauthParams = buildOAuthParams({ consumerKey, accessToken });

  // For multipart: only sign OAuth params, NOT body params
  const baseString = [
    method.toUpperCase(),
    percentEncode(normalizeUrl(url)),
    percentEncode(
      Object.keys(oauthParams)
        .sort()
        .map((key) => `${percentEncode(key)}=${percentEncode(oauthParams[key])}`)
        .join('&')
    ),
  ].join('&');

  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(accessTokenSecret)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

  oauthParams.oauth_signature = signature;

  return toAuthHeader(oauthParams);
}

// For application/x-www-form-urlencoded requests
export function buildOAuthHeaderUrlEncoded({
  method,
  url,
  consumerKey,
  consumerSecret,
  accessToken,
  accessTokenSecret,
  bodyParams = {},
}: {
  method: string;
  url: string;
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
  bodyParams?: Record<string, string>;
}) {
  const oauthParams = buildOAuthParams({ consumerKey, accessToken });

  // For URL-encoded: include body params in signature
  const allParams = { ...oauthParams, ...bodyParams };

  const baseString = [
    method.toUpperCase(),
    percentEncode(normalizeUrl(url)),
    percentEncode(
      Object.keys(allParams)
        .sort()
        .map((key) => `${percentEncode(key)}=${percentEncode(allParams[key])}`)
        .join('&')
    ),
  ].join('&');

  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(accessTokenSecret)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

  oauthParams.oauth_signature = signature;

  return toAuthHeader(oauthParams);
}

// For JSON requests
export function buildOAuthHeaderJson({
  method,
  url,
  consumerKey,
  consumerSecret,
  accessToken,
  accessTokenSecret,
}: {
  method: string;
  url: string;
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}) {
  const oauthParams = buildOAuthParams({ consumerKey, accessToken });

  // For JSON: only OAuth params in signature
  const baseString = [
    method.toUpperCase(),
    percentEncode(normalizeUrl(url)),
    percentEncode(
      Object.keys(oauthParams)
        .sort()
        .map((key) => `${percentEncode(key)}=${percentEncode(oauthParams[key])}`)
        .join('&')
    ),
  ].join('&');

  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(accessTokenSecret)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

  oauthParams.oauth_signature = signature;

  return toAuthHeader(oauthParams);
}

export async function uploadXImage({
  accessToken,
  accessTokenSecret,
  fileBuffer,
  mimeType,
}: {
  accessToken: string;
  accessTokenSecret: string;
  fileBuffer: Buffer;
  mimeType: string;
}): Promise<string> {
  const url = 'https://upload.twitter.com/1.1/media/upload.json';

  // Use base64 media_data - more reliable in Node.js runtime
  const mediaData = fileBuffer.toString('base64');

  // Determine media category
  let mediaCategory = 'tweet_image';
  if (mimeType.startsWith('video/')) {
    mediaCategory = 'tweet_video';
  } else if (mimeType === 'image/gif') {
    mediaCategory = 'tweet_gif';
  }

  // Create FormData for multipart request
  const form = new FormData();
  form.append('media_data', mediaData);
  form.append('media_category', mediaCategory);

  // Use multipart signing - only OAuth params in signature
  const authHeader = buildOAuthHeaderMultipart({
    method: 'POST',
    url,
    consumerKey: process.env.X_API_KEY!,
    consumerSecret: process.env.X_API_SECRET!,
    accessToken,
    accessTokenSecret,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      // Don't set Content-Type header - FormData will set it with boundary
    },
    body: form,
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Twitter media upload failed: ${text}`);
  }

  const json = JSON.parse(text);
  return json.media_id_string as string;
}

export async function uploadXVideo({
  accessToken,
  accessTokenSecret,
  fileBuffer,
  mimeType,
}: {
  accessToken: string;
  accessTokenSecret: string;
  fileBuffer: Buffer;
  mimeType: string;
}): Promise<string> {
  const totalBytes = fileBuffer.length;
  const baseUrl = 'https://upload.twitter.com/1.1/media/upload.json';
  const mediaCategory = mimeType.startsWith('video/') ? 'tweet_video' : 'tweet_gif';

  // INIT
    const bodyParams = {
      command: 'INIT',
      total_bytes: totalBytes.toString(),
      media_type: mimeType,
      media_category: mediaCategory,
    };

    const authHeader = buildOAuthHeaderUrlEncoded({
      method: 'POST',
      url: baseUrl,
      consumerKey: process.env.X_API_KEY!,
      consumerSecret: process.env.X_API_SECRET!,
      accessToken,
      accessTokenSecret,
      bodyParams,
    });

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(bodyParams).toString(),
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`X video INIT failed: ${text}`);
    }

    const json = JSON.parse(text);
    const mediaId = json.media_id_string as string;

    // APPEND
    const chunkSize = 5 * 1024 * 1024;
    let segmentIndex = 0;

    for (let offset = 0; offset < totalBytes; offset += chunkSize) {
      const chunk = fileBuffer.subarray(offset, Math.min(offset + chunkSize, totalBytes));

      const form = new FormData();
      form.append('command', 'APPEND');
      form.append('media_id', mediaId);
      form.append('segment_index', segmentIndex.toString());
      form.append('media', new Blob([new Uint8Array(chunk)], { type: mimeType }), 'chunk');

      const appendAuthHeader = buildOAuthHeaderMultipart({
        method: 'POST',
        url: baseUrl,
        consumerKey: process.env.X_API_KEY!,
        consumerSecret: process.env.X_API_SECRET!,
        accessToken,
        accessTokenSecret,
      });

      const appendRes = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          Authorization: appendAuthHeader,
        },
        body: form,
      });

      const appendText = await appendRes.text();
      if (!appendRes.ok) {
        throw new Error(`X video APPEND failed: ${appendText}`);
      }

      segmentIndex += 1;
    }

    // FINALIZE
    const finalizeBody = { command: 'FINALIZE', media_id: mediaId };

    const finalizeAuthHeader = buildOAuthHeaderUrlEncoded({
      method: 'POST',
      url: baseUrl,
      consumerKey: process.env.X_API_KEY!,
      consumerSecret: process.env.X_API_SECRET!,
      accessToken,
      accessTokenSecret,
      bodyParams: finalizeBody,
    });

    const finalizeRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        Authorization: finalizeAuthHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(finalizeBody).toString(),
    });

    const finalizeText = await finalizeRes.text();
    if (!finalizeRes.ok) {
      throw new Error(`X video FINALIZE failed: ${finalizeText}`);
    }

    const finalizeJson = JSON.parse(finalizeText);

    if (finalizeJson.processing_info) {
      await pollMediaStatus({ accessToken, accessTokenSecret, mediaId });
    }

    return mediaId;
  }

async function pollMediaStatus({
  accessToken,
  accessTokenSecret,
  mediaId,
}: {
  accessToken: string;
  accessTokenSecret: string;
  mediaId: string;
}) {
  const baseUrl = 'https://upload.twitter.com/1.1/media/upload.json';

  for (let i = 0; i < 20; i++) {
    const url = `${baseUrl}?command=STATUS&media_id=${encodeURIComponent(mediaId)}`;

    // Extract query parameters for OAuth signature
    const urlObj = new URL(url);
    const queryParams: Record<string, string> = {};
    for (const [key, value] of urlObj.searchParams) {
      queryParams[key] = value;
    }

    const authHeader = buildOAuthHeaderUrlEncoded({
      method: 'GET',
      url,
      consumerKey: process.env.X_API_KEY!,
      consumerSecret: process.env.X_API_SECRET!,
      accessToken,
      accessTokenSecret,
      bodyParams: queryParams,
    });

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
      },
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`X video STATUS failed: ${text}`);
    }

    const json = JSON.parse(text);
    const info = json.processing_info;

    if (!info || info.state === 'succeeded') {
      return;
    }

    if (info.state === 'failed') {
      throw new Error(`X video processing failed: ${JSON.stringify(info)}`);
    }

    const waitSeconds = info.check_after_secs || 2;
    await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
  }

  throw new Error('X video processing timed out');
}
