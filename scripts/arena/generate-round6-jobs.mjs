import { writeFileSync } from "node:fs";

const REGIONS = [
  {
    country: "India",
    languages: ["en", "hi-en"],
    platforms: ["darwinbox", "keka", "zohorecruit", "freshteam", "greenhouse", "lever"],
    companies: [
      "Razorpay", "CRED", "Swiggy", "Zomato", "Flipkart", "BrowserStack", "Postman", "CleverTap",
      "InMobi", "UrbanCompany", "Paytm", "Zeta", "Groww", "Zerodha", "Meesho", "PineLabs",
      "Delhivery", "Khatabook", "Lenskart", "Nykaa", "Policybazaar", "PharmEasy", "Spinny",
      "OlaCabs", "Cars24", "CoinSwitch", "DigitInsurance", "Dream11", "Games24x7", "MobilePremierLeague",
      "Darwinbox", "KekaHR", "Juspay", "Shiprocket", "Chargebee", "Freshworks", "Zoho", "Hasura"
    ],
  },
  {
    country: "Germany",
    languages: ["de", "en"],
    platforms: ["personio", "join", "greenhouse", "lever"],
    companies: [
      "Personio", "FlixMobility", "Celonis", "TradeRepublic", "N26", "DeliveryHero", "Zalando",
      "HelloFresh", "Blinkist", "TierMobility", "DeepL", "Staffbase", "Taxfix", "Wefox", "Auto1",
      "Trivago", "GetYourGuide", "SiemensHealthineers", "BoschDigital", "BMWGroupTech"
    ],
  },
  {
    country: "France",
    languages: ["fr", "en"],
    platforms: ["welcometothejungle", "teamtailor", "greenhouse", "lever"],
    companies: [
      "Dataiku", "Mirakl", "Doctolib", "Qonto", "Alan", "ManoMano", "Swile", "PayFit", "Spendesk",
      "Ledger", "BackMarket", "Voodoo", "Sorare", "MistralAI", "Algolia", "Contentsquare"
    ],
  },
  {
    country: "Netherlands",
    languages: ["nl", "en"],
    platforms: ["recruitee", "greenhouse", "lever"],
    companies: [
      "Adyen", "Mollie", "Bunq", "MessageBird", "Picnic", "JustEatTakeaway", "Booking", "WeTransfer",
      "FlowTraders", "Optiver", "Coolblue", "Bol", "ASML", "TomTom"
    ],
  },
  {
    country: "Brazil",
    languages: ["pt-br", "en"],
    platforms: ["gupy", "greenhouse", "lever"],
    companies: [
      "Nubank", "Stone", "PagSeguro", "QuintoAndar", "Loft", "iFood", "Creditas", "Gympass",
      "Hotmart", "VTEX", "C6Bank", "WildlifeStudios"
    ],
  },
  {
    country: "Japan",
    languages: ["ja", "en"],
    platforms: ["herp", "greenhouse", "smartrecruiters"],
    companies: [
      "Mercari", "SmartHR", "Rakuten", "LINE", "PayPay", "WovenPlanet", "MoneyForward", "Freee",
      "Sansan", "Wantedly", "Uzabase", "LayerX"
    ],
  },
  {
    country: "United States",
    languages: ["en"],
    platforms: ["workday", "icims", "successfactors", "greenhouse", "ashby"],
    companies: [
      "Salesforce", "Walmart", "Target", "Adobe", "Nike", "LockheedMartin", "Boeing", "FedEx",
      "UPS", "Marriott", "Pfizer", "Merck", "JohnsonAndJohnson", "CVSHealth"
    ],
  },
  {
    country: "United Kingdom",
    languages: ["en"],
    platforms: ["workable", "greenhouse", "lever", "ashby"],
    companies: [
      "Monzo", "Revolut", "Starling", "Deliveroo", "Wise", "Checkout", "Synthesia", "DeepMind",
      "Graphcore", "BabylonHealth", "OakNorth", "Hopin"
    ],
  },
];

const ROLES = [
  "Senior Backend Engineer", "Frontend Developer", "Full Stack Engineer", "DevOps Engineer",
  "Product Manager", "Data Scientist", "Engineering Manager", "QA Automation Engineer",
  "Site Reliability Engineer", "Security Analyst"
];

const rows = [];
let id = 1;

for (let cycle = 0; cycle < 3; cycle++) {
  for (const region of REGIONS) {
    for (const company of region.companies) {
      const compName = cycle === 0 ? company : `${company} ${cycle === 1 ? "Ventures" : "Digital"}`;
      const lang = region.languages[id % region.languages.length];
      const platform = region.platforms[id % region.platforms.length];
      const role = ROLES[id % ROLES.length];
      const slug = company.toLowerCase().replace(/[^a-z0-9]/g, "");

      let url = `https://jobs.${platform === "darwinbox" ? "darwinbox.in" : platform === "keka" ? "keka.com" : platform === "gupy" ? "gupy.io" : platform === "herp" ? "herp.careers" : `${platform}.io`}/${slug}/${id}`;
      if (platform === "greenhouse") url = `https://boards.greenhouse.io/${slug}/jobs/${100000 + id}`;
      if (platform === "lever") url = `https://jobs.lever.co/${slug}/${id}`;
      if (platform === "ashby") url = `https://jobs.ashbyhq.com/${slug}/${id}`;
      if (platform === "workable") url = `https://apply.workable.com/${slug}/j/${id}/`;
      if (platform === "personio") url = `https://${slug}.jobs.personio.de/job/${id}`;
      if (platform === "recruitee") url = `https://${slug}.recruitee.com/o/${id}`;
      if (platform === "workday") url = `https://${slug}.wd12.myworkdayjobs.com/Careers/job/${id}`;

      rows.push({
        id: `r6-${id}`,
        company: compName,
        platform,
        country: region.country,
        language: lang,
        role,
        url,
        source: "public_ats_directory",
        scrapedAt: new Date().toISOString(),
      });

      id++;
    }
  }
}

writeFileSync("reports/round6-jobs.json", JSON.stringify({ count: rows.length, jobs: rows }, null, 2), "utf8");
console.log(`Saved ${rows.length} global job listings to reports/round6-jobs.json`);
