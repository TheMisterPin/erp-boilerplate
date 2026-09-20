const DEFAULT_SESSION_IDLE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const DEFAULT_SESSION_ABSOLUTE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const MINIMUM_PRODUCTION_JWT_SECRET_LENGTH = 32;

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not set`);
  }

  return value;
}

export function getJwtSecret(): string {
  return validateJwtSecret(requireEnv("JWT_SECRET"), process.env.NODE_ENV);
}

function parsePositiveInteger(
  name: string,
  value: string | undefined,
  fallback: number,
): number {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);

  if (!Number.isSafeInteger(parsed) || parsed <= 0 || String(parsed) !== value) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

export function validateJwtSecret(
  secret: string,
  nodeEnv: string | undefined,
): string {
  if (
    nodeEnv === "production" &&
    secret.length < MINIMUM_PRODUCTION_JWT_SECRET_LENGTH
  ) {
    throw new Error(
      `JWT_SECRET must be at least ${MINIMUM_PRODUCTION_JWT_SECRET_LENGTH} characters in production`,
    );
  }

  return secret;
}

export function getSessionIdleMaxAgeSeconds(): number {
  const value =
    process.env.SESSION_IDLE_MAX_AGE_SECONDS ??
    process.env.SESSION_MAX_AGE_SECONDS;

  return parsePositiveInteger(
    "SESSION_IDLE_MAX_AGE_SECONDS",
    value,
    DEFAULT_SESSION_IDLE_MAX_AGE_SECONDS,
  );
}

export function getSessionAbsoluteMaxAgeSeconds(): number {
  const value = process.env.SESSION_ABSOLUTE_MAX_AGE_SECONDS;

  const absoluteMaxAge = parsePositiveInteger(
    "SESSION_ABSOLUTE_MAX_AGE_SECONDS",
    value,
    DEFAULT_SESSION_ABSOLUTE_MAX_AGE_SECONDS,
  );
  const idleMaxAge = getSessionIdleMaxAgeSeconds();

  if (absoluteMaxAge < idleMaxAge) {
    throw new Error(
      "SESSION_ABSOLUTE_MAX_AGE_SECONDS must be greater than or equal to SESSION_IDLE_MAX_AGE_SECONDS",
    );
  }

  return absoluteMaxAge;
}

export function getSessionJwtIssuer(): string {
  return process.env.SESSION_JWT_ISSUER ?? "erp-boilerplate";
}

export function getSessionJwtAudience(): string {
  return process.env.SESSION_JWT_AUDIENCE ?? "erp-boilerplate-app";
}
