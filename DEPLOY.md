# Deploying ApplyAgent to real users

Three parts: the **job feed** (JobReach), the **licence server** (Cloudflare Worker + Razorpay), and the
**extension** (Chrome Web Store). Do them in this order. Check current fees and policies on each provider's
site before paying anything; they change.

## 0. Before anything
- Pick the final product name and check it is free (trademark search, Chrome Web Store search, domain).
- A small website (Cloudflare Pages / GitHub Pages, free) with: landing page, **Privacy Policy**
  (start from `PRIVACY.md`), **Terms**, **Refund policy** ("one-time 30-day pass, refunds within 7 days"),
  and a **Contact** email. Razorpay and the Chrome Web Store both require these.

## 1. Job feed (JobReach)
```bash
cd ../jobreach
python -m jobreach ingest                                # every 3 hours (cron / Task Scheduler)
python -m jobreach export-feed --out exports/feed.json   # after each ingest
```
Host `feed.json` at a fixed https URL (e.g. Cloudflare R2 or Pages). Users paste that URL once in the Jobs tab.
It contains only public job postings from employers' own career sites.

## 2. Razorpay
1. Sign up at razorpay.com, complete KYC (PAN, bank account; the website from step 0).
2. Settings → API Keys: create **Test** keys first, Live keys after testing.
3. Payment Links must be available on your account (default for most accounts).
4. For USD/card customers abroad: apply for **International Payments** in the dashboard (separate approval).
5. Webhooks: URL `https://<your-worker>/webhook`, event `payment_link.paid`, set a secret.

## 3. Licence server (Cloudflare Worker, free tier)
```bash
cd server
node keygen.mjs                                  # prints PRIVATE and PUBLIC keys
npx wrangler login
npx wrangler kv namespace create LICENSES        # paste the id into wrangler.toml
npx wrangler secret put RAZORPAY_KEY_ID
npx wrangler secret put RAZORPAY_KEY_SECRET
npx wrangler secret put RAZORPAY_WEBHOOK_SECRET
npx wrangler secret put LICENSE_PRIVATE_JWK      # the PRIVATE key from keygen (never commit it)
# set PUBLIC_BASE_URL in wrangler.toml to your worker URL, then:
npx wrangler deploy
```
Check: open `https://<worker>/buy?currency=INR` → Razorpay test checkout → pay with a test method →
you land on `/thanks` with a licence key.

## 4. Extension
1. `src/shared/config.ts`: set `LICENSE_SERVER` to the worker URL and `LICENSE_PUBLIC_JWK` to the PUBLIC key.
2. `static/manifest.json`: add the worker URL to `host_permissions` (e.g. `"https://applyagent-license.x.workers.dev/*"`),
   set the final `name`, bump `version`, add icons (16/32/48/128 px).
3. `npm test && npm run build`, then zip the **contents** of `dist/`.
4. Chrome Web Store developer account (one-time registration fee) → New item → upload the zip.
5. Listing: description, screenshots, the 60-second demo video, category "Productivity".
6. **Privacy practices** tab: declare personally identifiable information + website content handled
   locally; link your Privacy Policy; certify no selling of data.
7. **Permission justifications** (reviewers read these):
   - `sidePanel`: the app's UI. `storage`/`unlimitedStorage`: profile, resume, tracker kept locally.
   - `scripting`/`activeTab`/optional host permissions: fill the application form on sites the user allows, one site at a time.
   - No `tabs` permission (so no "Read your browsing history" warning): queued jobs open with `chrome.tabs.create`,
     which needs no permission; a tab's address is only read on sites the user allowed or after they opened ApplyAgent there.
   - `contextMenus`: the "Fill this application with ApplyAgent" right-click entry. `alarms`: resume the queue after Chrome restarts.
   - `offscreen`: runs the offline question-understanding model (WebAssembly); nothing leaves the computer.
   - Copy-paste text for every field, and the screenshots: `store/LISTING.md`.
   - Content script registered at runtime (`scripting.registerContentScripts`) only on sites the user allowed, never on
     LinkedIn/Indeed/Naukri and similar platforms; it reads pages only when silent detection is on for that site.
8. Start as **Unlisted** for the beta, then **Public**.

## 5. After launch
- Weekly: run the extension on 5–10 real forms per platform; JobReach `audit` on the feed.
- Watch failure reports per platform; fix fast (the #1 complaint about competitors is breakage).
- Keep refunds fast and cancellation trivial (there is nothing to cancel: passes don't renew).

## Payment gateway choice
| Option | Good for | Watch out |
|---|---|---|
| **Razorpay** (built in) | India: UPI, cards, wallets; international cards after approval | International payments need separate approval; you handle tax registration questions with a CA |
| Paddle / Lemon Squeezy (later) | Global sales: they act as merchant of record and handle foreign VAT/sales tax | Higher fees; check they onboard sellers from India |
Start with Razorpay (one integration, India + international cards). Add a merchant-of-record provider when
global sales grow and tax handling abroad becomes a burden.
