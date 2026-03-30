import crypto from 'crypto';

type OAuthToken = {
  key: string;
  secret: string;
};

type OAuthParamsInput = {
  method: string;
  url: string;
  consumerKey: string;
  consumerSecret: string;
  token?: OAuthToken;
  extraParams?: Record<string, string>;
  verifier?: string;
  callback?: string;
};

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function generateNonce(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

function generateTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

function normalizeUrl(input: string): string {
  const url = new URL(input);
  url.hash = '';
  url.search = '';
  if (
    (url.protocol === 'http:' && url.port === '80') ||
    (url.protocol === 'https:' && url.port === '443')
  ) {
    url.port = '';
  }
  return url.toString();
}

function collectQueryParams(url: string): Record<string, string> {
  const parsed = new URL(url);
  const result: Record<string, string> = {};
  parsed.searchParams.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function buildSignatureBaseString(
  method: string,
  url: string,
  params: Record<string, string>
): string {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&');

  return [
    method.toUpperCase(),
    percentEncode(normalizeUrl(url)),
    percentEncode(sorted),
  ].join('&');
}

function buildSigningKey(consumerSecret: string, tokenSecret = ''): string {
  return `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
}

function signHmacSha1(baseString: string, signingKey: string): string {
  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
}

export function buildOAuthHeader({
  method,
  url,
  consumerKey,
  consumerSecret,
  token,
  extraParams = {},
  verifier,
  callback,
}: OAuthParamsInput): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: generateNonce(16),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: generateTimestamp(),
    oauth_version: '1.0',
  };

  if (token?.key) {
    oauthParams.oauth_token = token.key;
  }

  if (verifier) {
    oauthParams.oauth_verifier = verifier;
  }

  if (callback) {
    oauthParams.oauth_callback = callback;
  }

  const allParams = {
    ...collectQueryParams(url),
    ...extraParams,
    ...oauthParams,
  };

  const baseString = buildSignatureBaseString(method, url, allParams);
  const signingKey = buildSigningKey(consumerSecret, token?.secret || '');
  const signature = signHmacSha1(baseString, signingKey);

  oauthParams.oauth_signature = signature;

  const header =
    'OAuth ' +
    Object.keys(oauthParams)
      .sort()
      .map((key) => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
      .join(', ');

  return header;
}

export function parseFormEncoded(body: string): Record<string, string> {
  const params = new URLSearchParams(body);
  const result: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
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

  const form = new FormData();
  form.append('media', new Blob([fileBuffer], { type: mimeType }));

  const authHeader = buildOAuthHeader({
    method: 'POST',
    url,
    consumerKey: process.env.X_API_KEY!,
    consumerSecret: process.env.X_API_SECRET!,
    token: { key: accessToken, secret: accessTokenSecret },
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
    },
    body: form,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`X image upload failed: ${text}`);
  }

  const json = JSON.parse(text);
  return json.media_id_string;
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
  {
    const bodyParams = new URLSearchParams({
      command: 'INIT',
      total_bytes: totalBytes.toString(),
      media_type: mimeType,
      media_category: mediaCategory,
    });

    const authHeader = buildOAuthHeader({
      method: 'POST',
      url: baseUrl,
      consumerKey: process.env.X_API_KEY!,
      consumerSecret: process.env.X_API_SECRET!,
      token: { key: accessToken, secret: accessTokenSecret },
      extraParams: {
        command: 'INIT',
        total_bytes: totalBytes.toString(),
        media_type: mimeType,
        media_category: mediaCategory,
      },
    });

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: bodyParams.toString(),
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
      form.append('media', new Blob([chunk], { type: mimeType }));

      const appendAuthHeader = buildOAuthHeader({
        method: 'POST',
        url: baseUrl,
        consumerKey: process.env.X_API_KEY!,
        consumerSecret: process.env.X_API_SECRET!,
        token: { key: accessToken, secret: accessTokenSecret },
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
    const finalizeBody = new URLSearchParams({
      command: 'FINALIZE',
      media_id: mediaId,
    });

    const finalizeAuthHeader = buildOAuthHeader({
      method: 'POST',
      url: baseUrl,
      consumerKey: process.env.X_API_KEY!,
      consumerSecret: process.env.X_API_SECRET!,
      token: { key: accessToken, secret: accessTokenSecret },
      extraParams: {
        command: 'FINALIZE',
        media_id: mediaId,
      },
    });

    const finalizeRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        Authorization: finalizeAuthHeader,
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: finalizeBody.toString(),
    });

    const finalizeText = await finalizeRes.text();
    if (!finalizeRes.ok) {
      throw new Error(`X video FINALIZE failed: ${finalizeText}`);
    }

    const finalizeJson = JSON.parse(finalizeText);

    if (finalizeJson.processing_info) {
      await pollMediaStatus({
        accessToken,
        accessTokenSecret,
        mediaId,
      });
    }

    return mediaId;
  }
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

    const authHeader = buildOAuthHeader({
      method: 'GET',
      url,
      consumerKey: process.env.X_API_KEY!,
      consumerSecret: process.env.X_API_SECRET!,
      token: { key: accessToken, secret: accessTokenSecret },
      extraParams: {
        command: 'STATUS',
        media_id: mediaId,
      },
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
