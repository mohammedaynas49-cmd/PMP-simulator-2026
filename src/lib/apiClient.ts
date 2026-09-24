import { auth } from '../firebase';

// Every server endpoint that costs money (Gemini calls) or writes data now requires a signed-in
// caller (see requireAuth/requireAdmin in server.ts) - this attaches the current Firebase ID
// token (present for both a real Google sign-in and a real anonymous guest session) to every
// request made through it. If there's no current user at all (e.g. the local, non-Firebase guest
// fallback used when Anonymous auth is disabled on the project - see README), the request is sent
// without a token and the server correctly responds 401; callers already handle a failed fetch.
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const idToken = await auth.currentUser?.getIdToken();
  const headers = new Headers(options.headers || {});
  if (idToken) {
    headers.set('Authorization', `Bearer ${idToken}`);
  }
  return fetch(url, { ...options, headers });
}
