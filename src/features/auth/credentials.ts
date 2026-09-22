export const DUMMY_PASSWORD_HASH =
  "$2b$10$FrOK/Qi9xyHs4wTvnesYb.OhgzozMFOl/6xcfCx508XXI68mn/uH6"

type LoginCandidate = {
  isActive: boolean
  password: string
}

type PasswordVerifier = (
  password: string,
  hash: string,
) => Promise<boolean>

/**
 * Performs exactly one password comparison, including when the account does
 * not exist, so invalid-account and wrong-password paths do comparable work.
 */
export async function credentialsMatch(
  candidate: LoginCandidate | null,
  password: string,
  verify: PasswordVerifier,
): Promise<boolean> {
  const passwordMatches = await verify(
    password,
    candidate?.password ?? DUMMY_PASSWORD_HASH,
  )

  return Boolean(candidate?.isActive && passwordMatches)
}
