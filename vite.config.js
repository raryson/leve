import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // The Marketplace uses NEXT_PUBLIC_*; expose ONLY the public Clerk key.
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || env.VITE_CLERK_PUBLISHABLE_KEY || '';
  const deployment = process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL;
  const siteUrl = new URL(process.env.SITE_URL || env.SITE_URL || (deployment ? `https://${deployment}` : 'https://leve-fawn.vercel.app')).origin;
  return {
    define: { 'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(publishableKey) },
    plugins: [{ name:'leve-share-metadata', transformIndexHtml: html => html.replaceAll('__SITE_URL__',siteUrl) }],
  };
});
