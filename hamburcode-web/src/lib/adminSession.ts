import crypto from "crypto";

type AdminSessionPayload = { exp: number };

function b64urlEncode(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function b64urlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function hmac(secret: string, data: string) {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

export function createAdminSessionToken(params: {
  secret: string;
  ttlSeconds: number;
}) {
  const payload: AdminSessionPayload = {
    exp: Math.floor(Date.now() / 1000) + params.ttlSeconds,
  };
  const body = b64urlEncode(JSON.stringify(payload));
  const sig = hmac(params.secret, body);
  return `${body}.${sig}`;
}

export function verifyAdminSessionToken(params: {
  secret: string;
  token?: string;
}) {
  const token = params.token;
  if (!token) return { ok: false as const };

  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false as const };

  const [body, sig] = parts;
  const expected = hmac(params.secret, body);

  const okSig = crypto.timingSafeEqual(
    Buffer.from(sig, "utf8"),
    Buffer.from(expected, "utf8")
  );

  if (!okSig) return { ok: false as const };

  let payload: AdminSessionPayload;
  try {
    payload = JSON.parse(b64urlDecode(body)) as AdminSessionPayload;
  } catch {
    return { ok: false as const };
  }

  if (typeof payload.exp !== "number") return { ok: false as const };
  if (payload.exp <= Math.floor(Date.now() / 1000))
    return { ok: false as const };

  return { ok: true as const };
}
