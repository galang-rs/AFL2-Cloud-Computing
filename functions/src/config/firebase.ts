/**
 * Firebase Configuration Provider
 * Strictly resolves configuration from runtime environment variables or Cloudflare Worker bindings.
 * NO credentials, secrets, or project identifiers are hardcoded.
 */

export function getFirebaseDatabaseUrl(customUrl?: string): string {
  const url =
    customUrl ||
    (typeof process !== 'undefined' ? process.env?.FIREBASE_DATABASE_URL : undefined) ||
    '';
  return url ? url.replace(/\/$/, '') : '';
}

export function getFirebaseApiKey(customKey?: string): string {
  return (
    customKey ||
    (typeof process !== 'undefined' ? process.env?.FIREBASE_API_KEY : undefined) ||
    ''
  );
}

export function getFirebaseProjectId(customId?: string): string {
  return (
    customId ||
    (typeof process !== 'undefined' ? process.env?.FIREBASE_PROJECT_ID : undefined) ||
    ''
  );
}
