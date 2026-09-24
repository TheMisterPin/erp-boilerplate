export const SECURITY_RESPONSE_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "accelerometer=(), camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
] as const

/**
 * A nonce lets Next.js attach CSP-safe script tags without allowing arbitrary
 * inline scripts. `style-src 'unsafe-inline'` remains necessary for Next's
 * runtime style tags and is documented in docs/operations.md.
 */
export function createContentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ].join("; ")
}

export function applySecurityHeaders(
  headers: Headers,
  contentSecurityPolicy: string,
): void {
  for (const header of SECURITY_RESPONSE_HEADERS) {
    headers.set(header.key, header.value)
  }
  headers.set("Content-Security-Policy", contentSecurityPolicy)
}
