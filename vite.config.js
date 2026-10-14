import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // The Marketplace uses NEXT_PUBLIC_*; expose ONLY the public Clerk key.
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || env.VITE_CLERK_PUBLISHABLE_KEY || '';
  return { define: { 'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(publishableKey) } };
});
