const encoder = new TextEncoder();

async function getKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

function base64url(buf: ArrayBuffer | Uint8Array) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBytes(str: string) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

export type PartyTokenPayload = {
  boardId: string;
  userId: string | null;
  role: "owner" | "editor" | "viewer" | null;
  exp: number;
};

export async function signPartyToken(payload: Omit<PartyTokenPayload, "exp">, secret: string) {
  const full: PartyTokenPayload = { ...payload, exp: Date.now() + 5 * 60 * 1000 };
  const bodyB64 = base64url(encoder.encode(JSON.stringify(full)));
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(bodyB64));
  return `${bodyB64}.${base64url(sig)}`;
}

export async function verifyPartyToken(token: string | null, secret: string): Promise<PartyTokenPayload | null> {
  if (!token) return null;
  const [bodyB64, sigB64] = token.split(".");
  if (!bodyB64 || !sigB64) return null;
  const key = await getKey(secret);
  const valid = await crypto.subtle.verify("HMAC", key, base64urlToBytes(sigB64), encoder.encode(bodyB64));
  if (!valid) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64urlToBytes(bodyB64))) as PartyTokenPayload;
    return payload.exp < Date.now() ? null : payload;
  } catch {
    return null;
  }
}