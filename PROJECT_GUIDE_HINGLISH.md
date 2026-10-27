# ApplyAgent — Poora Project, Simple Hinglish mein

## 1. Ek line mein
ApplyAgent ek Chrome extension hai jo **company career sites** par job application form **khud bhar deta hai**
(naam, email, phone, resume, notice period, salary…), **sensitive cheezein aapse poochta hai**, aur
**Submit aap dabate ho**. LinkedIn / Naukri / Indeed par yeh kabhi kuch nahi karta.

---

## 2. Extension ke 4 hisse (kaun kya karta hai)

Socho ek office hai jismein 4 log kaam karte hain:

| Hissa | File / folder | Kaam (simple mein) |
|---|---|---|
| **Side Panel** (Receptionist) | `src/sidepanel/` + `static/sidepanel.html` | Jo screen aap dekhte ho. Profile bharna, "Fill" button, queue, tracker, answers — sab yahin. |
| **Content Script** (Field worker) | `src/content/` | Job ke page ke andar ghus kar form padhta hai, decide karta hai kya bharna hai, aur bharta hai. |
| **Background** (Manager) | `src/background/` | Sab ko coordinate karta hai: queue chalana, toolbar icon animate karna, kaunse sites allowed hain, badge dikhana. |
| **Offscreen page** (Dimaag / AI) | `src/offscreen/` | Chhota AI model jo samajhta hai ki ajeeb sawaal ka matlab kya hai. Offline chalta hai, aapke computer par. |

Yeh sab aapas mein **messages** se baat karte hain (jaise WhatsApp messages): `RUN`, `SCAN`, `UNDERSTAND`, `DETECTED`…
Saare message types `src/shared/types.ts` mein likhe hain.

---

## 3. Ek application kaise bharti hai (step by step)

Aap kisi Greenhouse job ke page par ho aur **Fill** dabaya (ya `Alt+Shift+F`):

1. **Side panel** content script ko message bhejta hai: "RUN karo".
2. **Safety check**: kya yeh LinkedIn/Naukri jaisa platform hai? Haan → turant mana. (`src/shared/platforms.ts`)
3. **Form dhoondo** (`adapters.ts`): page par kai forms ho sakte hain (newsletter, search…). Woh form chuna jata hai jismein
   email/resume field ho. Agar sirf job description hai aur "Apply" button hai → pehle Apply page khola jata hai.
4. **Form padho** (`extract.ts`): har field ka label, type (text, dropdown, file…), required hai ya nahi.
   Mushkil cases bhi: shadow DOM, iframe, label `<p>` mein ho (BambooHR), custom dropdowns.
   **Spam-trap (honeypot) fields** chhod diye jaate hain — warna company application ko bot samajh kar fenk deti.
5. **Decide karo** har field ke liye (yeh project ka dil hai — section 4 dekho).
6. **Bharo** (`fill.ts`): bilkul insaan ki tarah — React/Vue sites ko pata chale isliye proper events fire hote hain.
   Pehle **resume** upload, phir thoda ruk kar (site khud resume padh kar fields bharti hai), phir baaki fields.
   Phone ke saath alag "country code" dropdown ho to code wahan, number box mein sirf number (`phone.ts`).
7. **Check karo**: jo bhara woh sach mein chipka ya nahi. Pehle se bhara hua (aapne type kiya) kabhi overwrite nahi.
8. **Multi-step form**: "Next" dabata hai (max 8 steps), "Submit" kabhi khud nahi (Review mode mein).
9. Side panel mein report: kitne bhare, kaunse sawaal **aapse** chahiye ("Needs your answer").
10. Aap Submit dabate ho → company ki site "Thank you for applying" dikhaye **tabhi** tracker mein "Applied" likha jata hai.

---

## 4. Dimaag: har field ka faisla kaise hota hai

Teen layer hain, upar se neeche:

### Layer 1 — Rules (`classify.ts`, `facts.ts`)
- **Sensitive sawaal pehle pakdo**: Aadhaar/SSN, signature, criminal record, disability… → **hamesha aapse poocho**.
- **Profile facts**: "First name" → Asha, "Email" → email. 7 languages mein (German, French, Spanish…).
- **Quick answers** (aap ek baar bharte ho): work permit, notice period, CTC, relocation, "how did you hear".
  - Work permit ka jawab **job ke country** se nikalta hai: aapne "India" likha, job USA ki hai →
    "Are you authorized to work in the US?" → **No**, "Will you need sponsorship?" → **Yes**.
  - Polarity samajhna zaroori: "...right to work in Poland **without the need for** a visa?" — yahan "need" ka matlab
    ulta nahi hai. (Yeh bug round 3 mein pakda aur fix kiya.)
- **Guards (rok-tok)** — yeh galti hone se bachate hain:
  - Yes/No sawaal mein naam/company kabhi nahi ("Are you based in India?" → aapse poocho).
  - Kisi aur ki details (referrer, manager, emergency contact) mein aapki details kabhi nahi.
  - "Describe…", "If you selected Other…", "work email at our company", "street address" → profile se nahi.
  - Lambi legal declarations, signatures → kabhi nahi.

### Layer 2 — Local AI model (`meaning.ts` + `src/offscreen/`)
- Jab rules ko sawaal samajh nahi aata ("Joining timeline?", "Please identify your sex"), tab AI se poocha jata hai.
- Model: **all-MiniLM-L6-v2** (23 MB, quantized) sentence ko numbers (vector) mein badalta hai; uske upar humara
  **trained layer** 55 "meanings" mein se ek chunta hai + confidence deta hai.
- **Do chaabi (two keys) rule**: AI tabhi bharta hai jab
  1. woh **85%+ sure** ho, **aur**
  2. sawaal mein us matlab ka **saaf shabd** ho ("hear", "notice", "salary"…), **aur**
  3. rules ke saare safety checks pass hon.
  Kyun? Test mein AI ne "Do you have a driver's license?" ko 99% confidence se "disability" padh liya tha —
  akele AI par bharosa khatarnak hai.
- Ulta bhi: rules kuch bharne wale hon par AI **95%+ sure** ho ki sawaal kuch aur hai → aapse poocha jata hai.
- Ek sawaal = ek run (batch nahi), taaki Preview aur Fill hamesha same jawab dein.
- Settings mein AI band kar sakte ho → sirf rules chalenge.

### Layer 3 — Aap
Jo bhi unclear hai, woh "Needs your answer" mein aata hai. Aapka jawab **save** hota hai aur agli baar same sawaal
par khud bhar jata hai (sirf jab sawaal sach mein same ho).

---

## 5. Baaki features
| Feature | Kya karta hai | File |
|---|---|---|
| **Queue** | Job links paste karo, ek saath max 5 applications, human speed par, ek company par ek hi | `background/queue.ts`, `runner.ts` |
| **Tracker** | Har confirmed application ka saboot (confirmation text) | `sidepanel` |
| **Silent detection** | Page par form dikhe to icon par badge: "itne bhar sakta hoon" — sirf padhta hai, kuch type nahi | `background/detector.ts` |
| **Auto-open** | Job description page par Fill dabao → khud Apply page kholta hai | `content/sense.ts`, `runner.ts` |
| **Backup / Restore** | Profile + answers ek file mein | `shared/backup.ts` |
| **Report a problem** | Bug report jismein aapki personal values hata di jaati hain | `shared/diagnostic.ts` |
| **Licence / Payment** | Free plan + paid pass, Razorpay se, Cloudflare Worker server | `server/`, `shared/license.ts` |
| **Logo** | "A" jiska crossbar ek tick hai; animate hota hai jab kaam karta hai | `scripts/brand-mark.mjs` |

---

## 6. Privacy (users ko yeh batana)
- Profile, resume, answers — **sirf aapke browser mein**. Kahin upload nahi.
- AI model bhi **offline**, extension ke andar. Koi API cost nahi, koi data bahar nahi.
- Server sirf licence check ke liye (agar paid plan liya).

---

## 7. Testing — kaise pata ki yeh sach mein kaam karta hai
| Test | Kya check karta hai | Number |
|---|---|---|
| **Unit tests** (`test/`) | Har function: rules, guards, phone, honeypot, 30 asli forms offline replay | 380 pass |
| **Browser tests** (`e2e/`) | Asli Chrome mein asli extension: fill, multi-step, iframe, queue, AI model, accessibility | 60 pass |
| **Knockout safety test** | 50 internet se liye screening sawaal × 55 galat AI readings @99% → kuch nahi bharna chahiye | pass |
| **Real-form scans** | 196 asli company forms padhe (kuch type/submit nahi kiya), koi page change nahi hua | 3 rounds |
| **Unseen-data test** | Nayi companies ke forms, haath se label, **pehle measure phir fix** | galti 12% → 5% → 0 |

Har round ka loop: **naye forms scan → sawaal label → measure → galti ka pattern fix → test add → model retrain**.

Commands:
```bash
npm test                    # unit tests
npm run e2e                 # browser tests
npm run build               # dist/ banata hai (Chrome mein Load unpacked)
node scripts/train-intents.mjs   # AI model retrain
```

---

## 8. Folder map (kya kahan hai)
```
applyagent/
├── src/content/      form padhna, decide karna, bharna (agent ka dimaag + haath)
├── src/background/   manager: queue, detector, icon, AI ka raasta
├── src/offscreen/    AI model chalane wala page
├── src/sidepanel/    UI jo aap dekhte ho
├── src/shared/       sabka common: types, storage, countries, text, platforms
├── static/           manifest, HTML, CSS, icons, trained AI layer (intent/model.json)
├── server/           licence + Razorpay server (Cloudflare Worker)
├── test/  e2e/       saare tests;  testpages/ = practice forms
├── reports/          real-form scans, labels, evaluation results
├── scripts/          model training, icons, store screenshots
├── store/            Chrome Web Store ke screenshots + listing text
└── brand/            logo, promo tile
```

---

## 9. Abhi kya baaki hai (honest)
| Kaam | Kaun | Time |
|---|---|---|
| Day 1–3 real testing (links #9–#20, phir ek real fill bina submit) | **Aap** | 2–3 din |
| Razorpay account + KYC, Cloudflare Worker deploy (`DEPLOY.md`) | **Aap** (main guide karunga) | ~1 din |
| Website: privacy policy, terms, refund page | Aap + main | ~half din |
| Chrome Web Store developer account + upload (`store/LISTING.md` ready) | **Aap** | ~1 ghanta + review wait |
| Workday (login wali sites) | baad mein | — |
| AI ko Hindi/other languages sikhana (rules already 7 languages) | baad mein | — |

**Limits jo users ko pata hone chahiye:** ~45% fields bina quick answers ke khud bharte hain; baaki aapke asli faisle
hain (essay, screening sawaal) jo jaan-boojh kar aapke liye chhode jaate hain. SmartRecruiters kabhi kabhi robot-check
dikhata hai — user khud solve karta hai.
