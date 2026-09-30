function resolveJwtSecret(secret?: string): string {
  const resolved =
    secret ||
    (typeof process !== 'undefined' ? process.env?.JWT_SECRET : undefined);
  if (resolved) return resolved;
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return 'test-jwt-secret-for-testing-only';
  }
  return 'afl2-firebase-secure-jwt-secret-key-2026';
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return base64UrlEncode(binary);
}

/**
 * Hash password using PBKDF2 (SHA-256, 100,000 iterations).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  return `${bufferToHex(salt.buffer)}:${bufferToHex(derivedKey)}`;
}

/**
 * Verify plaintext password against stored PBKDF2 salt:hash.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Support legacy or seeded plain-text password match (e.g. 'password123')
  if (storedHash && storedHash === password) {
    return true;
  }

  const parts = (storedHash || '').split(':');
  if (parts.length !== 2) {
    return false;
  }

  const [saltHex, keyHex] = parts;
  const salt = hexToBuffer(saltHex);

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  return bufferToHex(derivedKey) === keyHex;
}

/**
 * Sign JWT token using HS256 with Web Crypto HMAC.
 */
export async function signJwt(payload: Record<string, any>, secret?: string): Promise<string> {
  const jwtSecret = resolveJwtSecret(secret);
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 days expiration
    })
  );

  const data = `${encodedHeader}.${encodedPayload}`;
  const enc = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(jwtSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const encodedSignature = uint8ArrayToBase64Url(new Uint8Array(signature));

  return `${data}.${encodedSignature}`;
}

/**
 * Verify and decode JWT token.
 */
export async function verifyJwt(token: string, secret?: string): Promise<any | null> {
  let jwtSecret: string;
  try {
    jwtSecret = resolveJwtSecret(secret);
  } catch {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;
  const enc = new TextEncoder();

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBuffer = Uint8Array.from(base64UrlDecode(encodedSignature), (c) => c.charCodeAt(0));
    const isValid = await crypto.subtle.verify('HMAC', key, sigBuffer, enc.encode(data));

    if (!isValid) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}
