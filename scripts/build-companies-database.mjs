import { writeFileSync } from "node:fs";

const ATS_LIST = ["greenhouse", "lever", "ashby", "smartrecruiters", "recruitee", "personio", "workable"];

const BASE_COMPANIES = [
  // Greenhouse tech / global
  { slug: "figma", name: "Figma", ats: "greenhouse", country: "United States", industry: "Design Software" },
  { slug: "stripe", name: "Stripe", ats: "greenhouse", country: "United States", industry: "Fintech" },
  { slug: "airbnb", name: "Airbnb", ats: "greenhouse", country: "United States", industry: "Hospitality" },
  { slug: "discord", name: "Discord", ats: "greenhouse", country: "United States", industry: "Communications" },
  { slug: "databricks", name: "Databricks", ats: "greenhouse", country: "United States", industry: "Data & AI" },
  { slug: "gitlab", name: "GitLab", ats: "greenhouse", country: "United States", industry: "Developer Tools" },
  { slug: "gusto", name: "Gusto", ats: "greenhouse", country: "United States", industry: "Payroll & HR" },
  { slug: "samsara", name: "Samsara", ats: "greenhouse", country: "United States", industry: "IoT" },
  { slug: "instacart", name: "Instacart", ats: "greenhouse", country: "United States", industry: "E-Commerce" },
  { slug: "doordash", name: "DoorDash", ats: "greenhouse", country: "United States", industry: "Food Delivery" },
  { slug: "twitch", name: "Twitch", ats: "greenhouse", country: "United States", industry: "Media Streaming" },
  { slug: "chime", name: "Chime", ats: "greenhouse", country: "United States", industry: "Fintech" },
  { slug: "postman", name: "Postman", ats: "greenhouse", country: "India", industry: "Developer Tools" },
  { slug: "browserstack", name: "BrowserStack", ats: "greenhouse", country: "India", industry: "Software Testing" },
  { slug: "razorpay", name: "Razorpay", ats: "greenhouse", country: "India", industry: "Fintech" },
  { slug: "cred", name: "CRED", ats: "greenhouse", country: "India", industry: "Fintech" },
  { slug: "swiggy", name: "Swiggy", ats: "greenhouse", country: "India", industry: "Food Delivery" },
  { slug: "dream11", name: "Dream11", ats: "greenhouse", country: "India", industry: "Gaming" },

  // Lever tech / global
  { slug: "spotify", name: "Spotify", ats: "lever", country: "Sweden", industry: "Music Streaming" },
  { slug: "palantir", name: "Palantir", ats: "lever", country: "United States", industry: "Data Analytics" },
  { slug: "netflix", name: "Netflix", ats: "lever", country: "United States", industry: "Entertainment" },
  { slug: "atlassian", name: "Atlassian", ats: "lever", country: "Australia", industry: "Collaboration" },
  { slug: "lyft", name: "Lyft", ats: "lever", country: "United States", industry: "Ridesharing" },
  { slug: "zeta", name: "Zeta", ats: "lever", country: "India", industry: "Banking Tech" },
  { slug: "paytm", name: "Paytm", ats: "lever", country: "India", industry: "Fintech" },
  { slug: "clevertap", name: "CleverTap", ats: "lever", country: "India", industry: "Customer Engagement" },
  { slug: "inmobi", name: "InMobi", ats: "lever", country: "India", industry: "AdTech" },
  { slug: "urbancompany", name: "Urban Company", ats: "lever", country: "India", industry: "Home Services" },

  // Ashby modern startups
  { slug: "airwallex", name: "Airwallex", ats: "ashby", country: "Australia", industry: "Fintech" },
  { slug: "linear", name: "Linear", ats: "ashby", country: "United States", industry: "Issue Tracking" },
  { slug: "replit", name: "Replit", ats: "ashby", country: "United States", industry: "Cloud IDE" },
  { slug: "ramp", name: "Ramp", ats: "ashby", country: "United States", industry: "Corporate Cards" },
  { slug: "deel", name: "Deel", ats: "ashby", country: "United States", industry: "Global Payroll" },
  { slug: "fireworks-ai", name: "Fireworks AI", ats: "ashby", country: "United States", industry: "AI Infrastructure" },
  { slug: "synthesia", name: "Synthesia", ats: "ashby", country: "United Kingdom", industry: "AI Video" },
  { slug: "elevenlabs", name: "ElevenLabs", ats: "ashby", country: "United States", industry: "AI Audio" },
  { slug: "cursor", name: "Cursor (Anysphere)", ats: "ashby", country: "United States", industry: "AI Editor" },

  // SmartRecruiters enterprise & European
  { slug: "ikea", name: "IKEA", ats: "smartrecruiters", country: "Sweden", industry: "Retail" },
  { slug: "bosch", name: "Bosch", ats: "smartrecruiters", country: "Germany", industry: "Engineering" },
  { slug: "visa", name: "Visa", ats: "smartrecruiters", country: "United States", industry: "Financial Services" },
  { slug: "linkedin", name: "LinkedIn Engineering", ats: "smartrecruiters", country: "United States", industry: "Software" },
  { slug: "skechers", name: "Skechers", ats: "smartrecruiters", country: "United States", industry: "Footwear" },

  // Recruitee Benelux & European
  { slug: "bluecrux", name: "Bluecrux", ats: "recruitee", country: "Belgium", industry: "Supply Chain" },
  { slug: "miaplatform", name: "Mia-Platform", ats: "recruitee", country: "Italy", industry: "Cloud Tech" },
  { slug: "sahl", name: "Sahl", ats: "recruitee", country: "Egypt", industry: "Fintech" },
  { slug: "bunq", name: "bunq", ats: "recruitee", country: "Netherlands", industry: "Neobank" },
  { slug: "wearelotus", name: "Lotus Bakeries", ats: "recruitee", country: "Belgium", industry: "Food Production" },

  // Personio DACH
  { slug: "personio", name: "Personio", ats: "personio", country: "Germany", industry: "HR Tech" },
  { slug: "kaiserxlabs", name: "Kaiser X Labs", ats: "personio", country: "Germany", industry: "Design Consultancy" },
  { slug: "europassistance", name: "Europ Assistance", ats: "personio", country: "Germany", industry: "Insurance" },
  { slug: "flix", name: "FlixBus / FlixMobility", ats: "personio", country: "Germany", industry: "Transportation" },
  { slug: "celonis", name: "Celonis", ats: "personio", country: "Germany", industry: "Process Mining" },
  { slug: "trade-republic", name: "Trade Republic", ats: "personio", country: "Germany", industry: "WealthTech" },

  // Workable UK & European & Global
  { slug: "bolderapps", name: "Bolder Apps", ats: "workable", country: "United Kingdom", industry: "Mobile Apps" },
  { slug: "revisionz", name: "Revisionz", ats: "workable", country: "Canada", industry: "Consulting" },
  { slug: "hireboost", name: "HireBoost", ats: "workable", country: "India", industry: "Staffing" },
  { slug: "monzo", name: "Monzo Bank", ats: "workable", country: "United Kingdom", industry: "Fintech" },
  { slug: "starling", name: "Starling Bank", ats: "workable", country: "United Kingdom", industry: "Fintech" },
];

// Only hand-picked companies. Every entry stays "unverified" until its public feed has been fetched and returned
// HTTP 200 with at least one job (Gemini arena-fix Step 2 records verifiedAt + jobCount). Never generate names.
const companies = BASE_COMPANIES.map((c) => ({ ...c, unverified: true }));
writeFileSync("static/companies.json", JSON.stringify(companies, null, 2) + "\n", "utf8");
console.log(`Wrote ${companies.length} hand-picked (unverified) companies to static/companies.json`);
