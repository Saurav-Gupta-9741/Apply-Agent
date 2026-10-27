/** Deployment settings. Fill these in after deploying the licence server (see DEPLOY.md).
 * While LICENSE_SERVER is empty, the extension runs in free mode only. */

export const LICENSE_SERVER = ""; // e.g. "https://applyagent-license.<your-subdomain>.workers.dev"

/** Public half of the licence-signing key (ECDSA P-256, JWK). Safe to ship: it can only verify, never sign. */
export const LICENSE_PUBLIC_JWK: JsonWebKey | null = null;

export const FREE_MONTHLY_SUBMISSIONS = 20;

/** Where users send "Report a problem" (opens their email app with the report). Empty: the report is only copied. */
export const SUPPORT_EMAIL = "";
