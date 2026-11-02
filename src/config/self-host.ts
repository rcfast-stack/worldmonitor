function readBuildFlag(read: () => string | undefined): boolean {
  try {
    return read() === 'true';
  } catch {
    return false;
  }
}

/**
 * True in the self-hosted Docker image (the root Dockerfile sets
 * VITE_SELF_HOSTED=true). Such a build serves every variant from whatever host
 * it runs on, so variant switching stays in place instead of linking to the
 * worldmonitor.app subdomains.
 */
export const SELF_HOSTED_BUILD: boolean = readBuildFlag(() => import.meta.env.VITE_SELF_HOSTED);

/**
 * Self-hosted builds can show every visitor the Pro dashboard. Set
 * VITE_SELF_HOST_ALL_PRO=true at build time (Docker build arg of the same name).
 *
 * This only changes what the browser unlocks. Each API request still needs an
 * operator key from WORLDMONITOR_VALID_KEYS, which the reverse proxy in front
 * of the stack injects as X-WorldMonitor-Key (see SELF_HOSTING.md). Without
 * that, Pro panels render and their requests answer 401.
 */
export const SELF_HOST_ALL_PRO: boolean = readBuildFlag(() => import.meta.env.VITE_SELF_HOST_ALL_PRO);
