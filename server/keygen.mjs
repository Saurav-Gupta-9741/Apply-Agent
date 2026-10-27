// Generates the licence-signing key pair (run once: node server/keygen.mjs).
// Private JWK → `npx wrangler secret put LICENSE_PRIVATE_JWK` (never commit it).
// Public JWK  → paste into src/shared/config.ts as LICENSE_PUBLIC_JWK.
const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
console.log("PRIVATE (secret):\n" + JSON.stringify(privateJwk));
console.log("\nPUBLIC (extension config):\n" + JSON.stringify(publicJwk));
