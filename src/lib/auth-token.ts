import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "veille_admin";
const TWELVE_HOURS = 12 * 60 * 60 * 1000;

export function signSession(secret: string, now = Date.now()): string {
  const payload = `v1.${now + TWELVE_HOURS}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySession(token: string | undefined, secret: string | undefined, now = Date.now()): boolean {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [version, expires, signature] = parts;
  if (version !== "v1" || !/^\d+$/.test(expires)) return false;
  if (Number(expires) < now) return false;
  const payload = `${version}.${expires}`;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function passwordsMatch(input: string, expected: string | undefined): boolean {
  if (!expected) return false;
  const left = Buffer.from(input);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

const attempts = new Map<string, { count: number; reset: number }>();

export function loginAllowed(key: string, now = Date.now()): boolean {
  const entry = attempts.get(key);
  if (!entry || entry.reset < now) return true;
  return entry.count < 8;
}

export function registerLoginFailure(key: string, now = Date.now()): void {
  const entry = attempts.get(key);
  if (!entry || entry.reset < now) {
    attempts.set(key, { count: 1, reset: now + 15 * 60 * 1000 });
    return;
  }
  entry.count += 1;
}

export function clearLoginAttempts(key: string): void {
  attempts.delete(key);
}
