/** Login fills a sparse organization unless this is explicitly off or a test run. */
export function shouldEnsureDemoData(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.SEED_ON_LOGIN === "false") return false
  if (env.SEED_ON_LOGIN === "true") return true
  if (env.NODE_ENV === "test" || env.VITEST) return false
  return env.NODE_ENV !== "production"
}
