import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getDatabase, Database } from 'firebase-admin/database';
import { getAuth, Auth } from 'firebase-admin/auth';

export function initFirebaseAdmin(): App {
  const apps = getApps();
  if (apps.length > 0) {
    return getApp();
  }

  const databaseURL =
    process.env.FIREBASE_DATABASE_URL ||
    'https://afl2-7e2a5-default-rtdb.firebaseio.com';

  const projectId = process.env.FIREBASE_PROJECT_ID || 'afl2-7e2a5';

  return initializeApp({
    projectId,
    databaseURL,
  });
}

export function getAdminDatabase(): Database {
  const app = initFirebaseAdmin();
  return getDatabase(app);
}

export function getAdminAuth(): Auth {
  const app = initFirebaseAdmin();
  return getAuth(app);
}
