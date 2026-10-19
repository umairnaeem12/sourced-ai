// Web Crypto only: this runs in middleware (Edge runtime) as well as in route handlers.
export const ADMIN_COOKIE = "hg_admin";
export const SESSION_HOURS = 12;
export const MIN_PASSWORD_LENGTH = 6;

const encoder = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data))));
}

async function sha256(text: string): Promise<string> {
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(text))));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

export function isUsablePassword(password: string | undefined): password is string {
  return typeof password === "string" && password.length >= MIN_PASSWORD_LENGTH;
}

// Hashing first means the comparison time doesn't depend on the password's length.
export async function passwordMatches(candidate: string, password: string): Promise<boolean> {
  const [candidateHash, passwordHash] = await Promise.all([sha256(candidate), sha256(password)]);
  return constantTimeEqual(candidateHash, passwordHash);
}

// Token is "v1.<expires_ms>.<hmac>", keyed by the admin password, so changing the
// password signs everyone out.
export async function createSessionToken(password: string, now = Date.now()): Promise<{ token: string; maxAge: number }> {
  const maxAge = SESSION_HOURS * 60 * 60;
  const payload = `v1.${now + maxAge * 1000}`;
  return { token: `${payload}.${await hmac(password, payload)}`, maxAge };
}

export async function verifySessionToken(
  token: string | undefined,
  password: string | undefined,
  now = Date.now(),
): Promise<boolean> {
  if (!token || !isUsablePassword(password)) return false;
  const [version, expires, signature] = token.split(".");
  if (version !== "v1" || !expires || !signature) return false;
  const expiresAt = Number(expires);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false;
  return constantTimeEqual(signature, await hmac(password, `${version}.${expires}`));
}

export function sessionCookie(token: string, maxAge: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ADMIN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearedSessionCookie(): string {
  return `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
