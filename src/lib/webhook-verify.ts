import crypto from 'crypto'

/**
 * Constant-time HMAC-SHA256 signature verification for mobile money callbacks.
 * Each provider signs the raw request body with a shared secret.
 *
 * If WEBHOOK_STRICT=true in production, missing/invalid secrets are rejected.
 * In development (no secret configured) callbacks are accepted — this matches
 * sandbox behaviour where providers don't sign test notifications.
 */
export function verifyHmacSignature(
  rawBody: Buffer,
  receivedSig: string | null,
  secret: string | undefined,
  algo: 'sha256' | 'sha1' = 'sha256'
): { ok: boolean; reason?: string } {
  const strict = process.env.WEBHOOK_STRICT === 'true' || process.env.NODE_ENV === 'production'

  if (!secret) {
    if (strict) return { ok: false, reason: 'Webhook secret not configured' }
    // Dev/sandbox: no secret configured → accept (providers don't sign sandbox events)
    return { ok: true }
  }

  if (!receivedSig) {
    return { ok: false, reason: 'Missing signature header' }
  }

  const expected = crypto
    .createHmac(algo, secret)
    .update(rawBody)
    .digest('hex')

  // Strip any algorithm prefix (e.g. "sha256=abc..." → "abc...")
  const cleaned = receivedSig.replace(/^(?:sha256|sha1)=/, '')

  const expectedBuf = Buffer.from(expected, 'hex')
  const receivedBuf = Buffer.from(cleaned.length === expected.length ? cleaned : '', 'hex')

  if (
    expectedBuf.length !== receivedBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, receivedBuf)
  ) {
    return { ok: false, reason: 'Signature mismatch' }
  }

  return { ok: true }
}

/**
 * Verify a bearer token in the Authorization header (used by M-Pesa result URLs).
 * Safaricom embeds a secret token you set when registering the result URL.
 */
export function verifyBearerToken(
  authHeader: string | null,
  secret: string | undefined
): { ok: boolean; reason?: string } {
  const strict = process.env.WEBHOOK_STRICT === 'true' || process.env.NODE_ENV === 'production'

  if (!secret) {
    if (strict) return { ok: false, reason: 'Webhook token not configured' }
    return { ok: true }
  }

  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, reason: 'Missing Bearer token' }
  }

  const token = authHeader.slice(7)
  const expected = Buffer.from(secret)
  const received = Buffer.from(token.length === secret.length ? token : '')

  if (
    expected.length !== received.length ||
    !crypto.timingSafeEqual(expected, received)
  ) {
    return { ok: false, reason: 'Invalid token' }
  }

  return { ok: true }
}
