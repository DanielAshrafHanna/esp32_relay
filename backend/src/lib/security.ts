import { createHash, createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

export function createId(): string {
  return randomUUID();
}

export function hashSecret(secret: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(secret, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export function verifySecret(secret: string, storedHash: string): boolean {
  const [algorithm, saltEncoded, hashEncoded] = storedHash.split("$");
  if (algorithm !== "scrypt" || !saltEncoded || !hashEncoded) {
    return false;
  }

  const salt = Buffer.from(saltEncoded, "base64url");
  const expected = Buffer.from(hashEncoded, "base64url");
  const actual = scryptSync(secret, salt, expected.length);

  return timingSafeEqual(actual, expected);
}

export interface JwtPayload {
  sub: string;
  kind: "user" | "service_account";
  customer_ids: string[];
  scopes: string[];
  email?: string;
  display_name?: string;
  iat: number;
  exp: number;
  iss: string;
}

export function signJwt(
  payload: Omit<JwtPayload, "iat" | "exp" | "iss">,
  secret: string,
  issuer: string,
  expiresInSeconds: number,
): string {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const issuedAt = Math.floor(Date.now() / 1000);
  const completePayload: JwtPayload = {
    ...payload,
    iat: issuedAt,
    exp: issuedAt + expiresInSeconds,
    iss: issuer,
  };

  const headerSegment = base64UrlEncode(JSON.stringify(header));
  const payloadSegment = base64UrlEncode(JSON.stringify(completePayload));
  const signature = createHmac("sha256", secret)
    .update(`${headerSegment}.${payloadSegment}`)
    .digest("base64url");

  return `${headerSegment}.${payloadSegment}.${signature}`;
}

export function verifyJwt(token: string, secret: string, issuer: string): JwtPayload {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed token");
  }

  const [headerSegment, payloadSegment, signatureSegment] = parts;
  const expectedSignature = createHmac("sha256", secret)
    .update(`${headerSegment}.${payloadSegment}`)
    .digest();
  const signature = base64UrlDecode(signatureSegment);

  if (signature.length !== expectedSignature.length || !timingSafeEqual(signature, expectedSignature)) {
    throw new Error("Invalid signature");
  }

  const payload = JSON.parse(base64UrlDecode(payloadSegment).toString("utf8")) as JwtPayload;
  const now = Math.floor(Date.now() / 1000);

  if (payload.iss !== issuer) {
    throw new Error("Invalid issuer");
  }

  if (payload.exp <= now) {
    throw new Error("Token expired");
  }

  return payload;
}

export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
