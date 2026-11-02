export const DASHBOARD_PATH = '/dashboard';
const HOSTED_DASHBOARD_URL = 'https://www.worldmonitor.app/dashboard';

// The self-hosted Docker image builds this page with VITE_SELF_HOSTED=true and
// serves the dashboard from the same host, so its links stay on that host.
const SELF_HOSTED = (() => {
  try {
    return import.meta.env.VITE_SELF_HOSTED === 'true';
  } catch {
    return false;
  }
})();

export const DASHBOARD_URL = SELF_HOSTED ? DASHBOARD_PATH : HOSTED_DASHBOARD_URL;
export const HOME_URL = SELF_HOSTED ? '/' : 'https://worldmonitor.app';

/** On a self-hosted build, point a worldmonitor.app dashboard link (e.g. a catalog CTA) at this host. */
export function localizeDashboardHref(href: string): string {
  if (!SELF_HOSTED) return href;
  return href.replace(/^https:\/\/(?:[a-z]+\.)?worldmonitor\.app(\/dashboard(?:[?#].*)?)$/, '$1');
}

/** A variant's dashboard: its worldmonitor.app subdomain, or this host when self-hosted. */
export function variantDashboardUrl(variant: 'finance' | 'commodity' | 'tech'): string {
  return SELF_HOSTED ? DASHBOARD_PATH : `https://${variant}.worldmonitor.app/dashboard`;
}

// Guarded checkout-return contract (mirrors the dashboard's
// buildDashboardCheckoutReturnUrl). Use this as the Dodo `return_url`: unlike
// `?wm_checkout=success`, the `return` marker only reconciles success when
// paired with authoritative Dodo evidence (subscription_id/payment_id + a
// success status) — a failed/cancelled/pending hosted return can no longer
// false-succeed via the bare success marker. See checkout-return.ts.
// Always absolute and hosted: the payment provider needs a full URL, and
// checkout only exists on the hosted service.
export const DASHBOARD_CHECKOUT_RETURN_URL = `${HOSTED_DASHBOARD_URL}?wm_checkout=return`;
export const DASHBOARD_EMBED_PREVIEW_URL = `${DASHBOARD_URL}?embed=pro-preview`;
