// Meta Graph API helper functions
const API_VERSION = process.env.META_API_VERSION || 'v18.0';
const GRAPH_BASE = `https://graph.facebook.com/${API_VERSION}`;

export type MetaError = {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id?: string;
};

export type GraphResponse<T> = T & {
  error?: MetaError;
};

export type MeResponse = {
  id: string;
  name: string;
};

export type InstagramBusinessAccount = {
  id: string;
  username?: string;
  profile_picture_url?: string;
};

export type PageAccount = {
  id: string;
  name: string;
  category?: string;
  access_token?: string;
  tasks?: string[];
  instagram_business_account?: InstagramBusinessAccount;
};

export type AccountsResponse = {
  data: PageAccount[];
  paging?: {
    next?: string;
    cursors?: {
      before?: string;
      after?: string;
    };
  };
};

export type InstagramProfileResponse = {
  id: string;
  username?: string;
  name?: string;
  biography?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  profile_picture_url?: string;
};

export async function graphGet<T>(
  pathOrUrl: string,
  accessToken: string
): Promise<GraphResponse<T>> {
  const url = pathOrUrl.startsWith('http')
    ? new URL(pathOrUrl)
    : new URL(`${GRAPH_BASE}/${pathOrUrl.replace(/^\//, '')}`);

  if (!url.searchParams.get('access_token')) {
    url.searchParams.set('access_token', accessToken);
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const json = await res.json();

  if (!res.ok) {
    return {
      error: json.error || {
        message: `Graph GET failed with status ${res.status}`,
        type: 'GraphError',
        code: res.status,
      },
    } as GraphResponse<T>;
  }

  return json;
}

export async function exchangeCodeForUserToken(
  code: string,
  redirectUri: string
): Promise<{
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
}> {
  const clientId = process.env.FACEBOOK_APP_ID!;
  const clientSecret = process.env.FACEBOOK_APP_SECRET!;

  const url = new URL(`${GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('client_secret', clientSecret);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('code', code);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.error?.message || 'Failed to exchange code for user token');
  }

  return json;
}

export async function getMe(userAccessToken: string) {
  return graphGet<MeResponse>('me?fields=id,name', userAccessToken);
}

export async function getAllPages(userAccessToken: string): Promise<PageAccount[]> {
  let nextUrl: string | null =
    `${GRAPH_BASE}/me/accounts?fields=id,name,category,tasks,access_token,instagram_business_account{id,username,profile_picture_url}`;

  const pages: PageAccount[] = [];

  while (nextUrl) {
    const response: GraphResponse<AccountsResponse> = await graphGet<AccountsResponse>(nextUrl, userAccessToken);

    if (response.error) {
      throw new Error(`Failed to fetch pages: ${response.error.message}`);
    }

    pages.push(...(response.data || []));
    nextUrl = response.paging?.next || null;
  }

  return pages;
}

export async function getInstagramProfile(
  igUserId: string,
  pageAccessToken: string
) {
  return graphGet<InstagramProfileResponse>(
    `${igUserId}?fields=id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url`,
    pageAccessToken
  );
}
