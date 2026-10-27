# ApplyAgent — Launch Plan (price, money, marketing, obstacles, devices)

Prices and fees below were checked on the web in October 2026; check each provider's own page before paying.

## 1. Price

**What competitors charge** (from comparison articles, often written by competitors, so treat as rough):
| Tool | Price |
|---|---|
| Jobright | ~$39.99/month |
| Simplify+ (paid tier; free autofill exists) | ~$39.99/month |
| AIApply auto-apply | from $49/month |
| JobGPT | from $34.99/month |
| Naukri paid profile boost (India) | ~₹700–1,000/month |

**Recommendation (already set up in the code, change one number to adjust):**
| Plan | Price | Why |
|---|---|---|
| **Free** | ₹0, 20 applications a month, every feature | Most students apply 10–30 times a month: they get hooked and tell friends |
| **Launch offer** (first month after launch) | **₹49** for the first 30-day pass | Your idea: almost free, builds trust, still filters out fake buyers |
| **Pro pass** | **₹149 / 30 days** (India), **$9 / 30 days** (abroad) | 4–6× cheaper than competitors; one-time, no auto-renewal = no "subscription trap" fear |

Later (when 100+ people pay): a **90-day pass at ₹349** (a job hunt lasts ~3 months), and "invite a friend, both get 7 days free".

Where the price lives: `server/wrangler.toml` → `PRICE_INR_PAISE` (14900 = ₹149; 4900 = ₹49), `PRICE_USD_CENTS`.

## 2. Money in and money out

**Do we need to spend money? Almost nothing.**
| Item | Cost | Needed? |
|---|---|---|
| Chrome Web Store developer account | **$5 once** (~₹450) | Yes |
| Cloudflare (licence server + website) | ₹0 (free tier) | Yes |
| Razorpay | ₹0 setup; **2% + GST (≈2.36%) per Indian payment**, ~3% + GST abroad | Yes |
| Own domain (applyagent.in etc.) | ~₹700–1,000 a year | Recommended (Razorpay and users trust it more); can start on a free `*.pages.dev` address |
| Email at your domain | ₹0 (Cloudflare Email Routing to your Gmail) | Recommended |
| AI / servers per user | **₹0** — the model runs on the user's computer | — |

**Total to launch: about ₹450–1,500.**

**What you keep:** ₹149 pass → about ₹145 after Razorpay. 100 paying users a month ≈ ₹14,500/month; 1,000 ≈ ₹1.45 lakh/month. Almost no cost grows with users.

**Tax (ask a CA once, ~₹1,000–2,000):** income from passes is taxable income. GST registration is generally needed only above ₹20 lakh a year of sales in India, but selling to people abroad has its own rules — confirm before turning on USD payments.

## 3. Marketing with ₹0 (in order)
1. **Beta with 20–50 people you know** (IIT Jodhpur batch, juniors in placement season). Free Pro for honest feedback + one line you can quote.
2. **60-second demo video** (script: `store/DEMO_SCRIPT.md`) → LinkedIn post, YouTube Shorts, Instagram Reels. "Built at IIT Jodhpur, 196 real forms tested" is your story.
3. **Build in public on LinkedIn**: one short post a week (a real bug you found, a number: "wrong answers 12% → 0").
4. **Placement / job WhatsApp & Telegram groups**: share the free plan, not a sales pitch.
5. **Reddit** (r/developersIndia, r/cscareerquestionsIndia): only where self-promotion is allowed; answer "how do I apply faster" questions honestly.
6. **Product Hunt + Peerlist launch** on one day, after 20+ store reviews.
7. **Chrome Web Store search**: good title, screenshots and early 5-star reviews from beta users matter most.
8. **Simple how-to pages on your site** ("How to fill a Greenhouse application in 30 seconds") — free Google traffic over months.

Target: 500 free users in month 1 → ~5% buy → 25 payers; grow by word of mouth from there.

## 4. Everything that can stop or slow the launch
| # | Obstacle | How bad | What we do |
|---|---|---|---|
| 1 | **Chrome Web Store review takes long or rejects.** Google says reviews are slower for broad site access, new developers and new extensions; developers report 1–3 weeks | High | Clear single purpose + every permission explained (`store/LISTING.md`); publish **Unlisted** first; answer reviewer emails fast |
| 2 | **Store policy: "automation/spam"** — the Auto-submit mode could look like mass applying | Medium | Store version defaults to Review-first; daily cap (25); never on LinkedIn/Naukri. Option: hide Auto-submit in v1 |
| 3 | **Razorpay KYC** needs PAN, bank account, and a live website with privacy/terms/refund pages; can take days; international payments need a separate approval | Medium | Website pages are ready (`site/`); apply early; start with INR only |
| 4 | **Name already taken** ("ApplyAgent" may exist) | Medium | Check store, Google, trademark search before paying for a domain |
| 5 | **Job sites change their forms / show robot checks** (SmartRecruiters' DataDome, Cloudflare) | Medium, ongoing | Weekly read-only scan of real forms (`e2e/coverage.spec.ts`); user solves robot checks themselves |
| 6 | **Employers or sites dislike automated applications** | Low–Medium | The user reviews and presses Submit; human pace; true information only (Terms) |
| 7 | **Privacy law** (India's DPDP Act, GDPR for EU users) | Low | No personal data on our servers; privacy policy published; deletion by email |
| 8 | **Tax/GST mistakes** | Low–Medium | One CA consultation before turning on USD |
| 9 | **Refund abuse / chargebacks** | Low | 7-day refunds; small price |
| 10 | **Support load on one person** | Medium | FAQ on site; "Report a problem" button already sends a clean report |
| 11 | **Big funded competitors** | Medium | Cheaper, privacy-first (offline AI), India-specific (CTC, notice period, Indian ATSs) |
| 12 | **Chrome changes extension rules** | Low | Already Manifest V3, no remote code |

## 5. Devices
| Device | Works? |
|---|---|
| Windows, Mac, Linux, Chromebook — Chrome, Edge, Brave | **Yes** (tested in Chromium) |
| Opera (no Chrome side panel) | **Yes** — opens in its own small window (tested) |
| Old/low-memory laptops (≤1 GB RAM) | **Yes** — AI model is skipped, rules still fill (tested) |
| Mac keyboard | **Yes** — shows ⌥⇧F and follows the user's own shortcut |
| Small laptop screens, zoom, screen readers | **Yes** — narrow and wide layouts, accessibility tests pass |
| **Phones (Android/iPhone)** | **No** — Chrome on phones does not run extensions. The website works on phones and tells people to open it on their computer |
| Firefox / Safari | Not yet (needs a separate version; later if users ask) |

## 6. Order of work to go live (~1–2 weeks)
1. You: Day 1–3 testing (2–3 days) → I fix what you find (1 day)
2. You: pick final name; buy domain (optional) — 1 hour
3. You: Razorpay sign-up + KYC (start now, runs in background) — 1 day + approval wait
4. Me + you: Cloudflare deploy of licence server and website (`DEPLOY.md`, `site/`) — 1 hour
5. You: Chrome Web Store account ($5) → upload, **Unlisted** — 1 hour + review wait
6. Beta with 20–50 people (1 week) → then **Public** + launch posts
