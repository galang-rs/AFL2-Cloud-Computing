import { onRequest } from 'firebase-functions/v2/https';
import { getRequestListener } from '@hono/node-server';
import { createApp } from './app';
import { initFirebaseAdmin } from './config/firebase';

// Initialize Firebase Admin singleton
initFirebaseAdmin();

// Initialize Hono Application
export const app = createApp();

// Wrap Hono application with Node request listener for Firebase Cloud Functions
const requestListener = getRequestListener(app.fetch);

// Export Firebase Cloud Functions HTTPS handler
export const api = onRequest(
  {
    cors: true,
    region: 'us-central1'
  },
  (req, res) => {
    requestListener(req, res);
  }
);

export default app;
