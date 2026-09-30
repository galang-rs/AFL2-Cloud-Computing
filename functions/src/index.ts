import { createApp } from './app';

// Initialize Hono Application for Cloudflare Workers & Edge runtime
export const app = createApp();

// Cloudflare Worker entrypoint
export default app;
