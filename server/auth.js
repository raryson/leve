import { createClerkClient } from '@clerk/backend';

let clerk;
export async function authenticate(request) {
  if (!request.headers.get('authorization')?.startsWith('Bearer ')) return null;
  if (!clerk) clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY, publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY });
  const origins = (process.env.APP_ORIGINS || '').split(',').filter(Boolean);
  for (const key of ['VERCEL_URL', 'VERCEL_BRANCH_URL', 'VERCEL_PROJECT_PRODUCTION_URL']) if (process.env[key]) origins.push(`https://${process.env[key]}`);
  if (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'development') {
    const url = new URL(request.url);
    if (/^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)$/.test(url.hostname)) origins.push(url.origin);
  }
  if (!origins.length) throw new Error('Nenhuma origem autorizada configurada.');
  const session = await clerk.authenticateRequest(request, { authorizedParties: [...new Set(origins)], acceptsToken: 'session_token' });
  return session.isAuthenticated ? session.toAuth().userId : null;
}
