/** Offline place data for the Profile's linked pickers (Country → State → City): the main cities of every state /
 * province / territory of India, the United States, Canada, Australia and the United Kingdom. Bundled with the
 * extension; nothing is looked up online. The lists only suggest: any city the user types is kept as typed.
 *
 * State names match profile-validate's state tables exactly (test/places.test.ts checks this). */

/** Cities per state, "|"-separated (compact). Keyed by ISO country code, then by the state's full name. */
const RAW: Record<string, Record<string, string>> = {
  IN: {
    "Andhra Pradesh": "Visakhapatnam|Vijayawada|Guntur|Nellore|Kurnool|Rajahmundry|Kakinada|Tirupati|Kadapa|Anantapur|Eluru|Vizianagaram|Ongole|Nandyal|Machilipatnam|Adoni|Tenali|Chittoor|Hindupur|Proddatur|Bhimavaram|Madanapalle|Guntakal|Dharmavaram|Gudivada|Srikakulam|Narasaraopet|Tadipatri|Tadepalligudem|Chilakaluripet|Amaravati",
    "Arunachal Pradesh": "Itanagar|Naharlagun|Pasighat|Tawang",
    "Assam": "Guwahati|Dispur|Silchar|Dibrugarh|Jorhat|Nagaon|Tinsukia|Tezpur|Bongaigaon",
    "Bihar": "Patna|Gaya|Bhagalpur|Muzaffarpur|Darbhanga|Purnia|Arrah|Begusarai|Katihar|Munger|Chhapra|Danapur|Saharsa|Sasaram|Hajipur|Dehri|Siwan|Motihari|Nawada|Bagaha|Buxar|Kishanganj|Sitamarhi|Jamalpur|Jehanabad|Aurangabad|Bettiah",
    "Chhattisgarh": "Raipur|Bhilai|Bilaspur|Korba|Durg|Rajnandgaon|Raigarh|Jagdalpur|Ambikapur|Nava Raipur",
    "Goa": "Panaji|Margao|Vasco da Gama|Mapusa|Ponda",
    "Gujarat": "Ahmedabad|Surat|Vadodara|Rajkot|Bhavnagar|Jamnagar|Junagadh|Gandhinagar|Anand|Nadiad|Morbi|Surendranagar|Bharuch|Vapi|Navsari|Veraval|Porbandar|Godhra|Bhuj|Gandhidham|Palanpur|Valsad|Patan|Deesa|Amreli|Mehsana|Botad|Jetpur|Gondal|Kalol",
    "Haryana": "Gurugram|Faridabad|Panipat|Ambala|Yamunanagar|Rohtak|Hisar|Karnal|Sonipat|Panchkula|Bhiwani|Sirsa|Bahadurgarh|Jind|Kurukshetra|Kaithal|Rewari|Palwal|Manesar",
    "Himachal Pradesh": "Shimla|Dharamshala|Solan|Mandi|Kullu|Manali|Baddi",
    "Jharkhand": "Ranchi|Jamshedpur|Dhanbad|Bokaro|Deoghar|Hazaribagh|Giridih|Ramgarh|Phusro|Medininagar|Chas|Adityapur",
    "Karnataka": "Bengaluru|Mysuru|Hubballi|Dharwad|Mangaluru|Belagavi|Kalaburagi|Davanagere|Ballari|Vijayapura|Shivamogga|Tumakuru|Raichur|Bidar|Hosapete|Udupi|Manipal|Gadag|Robertsonpet|Bhadravati|Chitradurga|Hassan|Mandya|Kolar|Chikkamagaluru|Bagalkot|Gangavati|Ranebennuru|Karwar",
    "Kerala": "Thiruvananthapuram|Kochi|Ernakulam|Kozhikode|Thrissur|Kollam|Kannur|Alappuzha|Palakkad|Malappuram|Kottayam|Kasaragod|Manjeri|Thalassery|Ponnani|Vadakara|Kanhangad|Payyanur|Koyilandy|Kalamassery|Neyyattinkara|Kayamkulam|Nedumangad|Pathanamthitta|Thodupuzha",
    "Madhya Pradesh": "Indore|Bhopal|Jabalpur|Gwalior|Ujjain|Sagar|Dewas|Satna|Ratlam|Rewa|Katni|Singrauli|Burhanpur|Khandwa|Bhind|Chhindwara|Guna|Shivpuri|Vidisha|Chhatarpur|Damoh|Mandsaur|Khargone|Neemuch|Pithampur|Hoshangabad|Itarsi|Sehore|Morena|Betul|Seoni|Datia|Nagda",
    "Maharashtra": "Mumbai|Pune|Nagpur|Thane|Navi Mumbai|Pimpri-Chinchwad|Nashik|Kalyan|Dombivli|Vasai-Virar|Aurangabad|Solapur|Mira-Bhayandar|Bhiwandi|Amravati|Nanded|Kolhapur|Ulhasnagar|Sangli|Malegaon|Jalgaon|Akola|Latur|Dhule|Ahmednagar|Chandrapur|Parbhani|Ichalkaranji|Jalna|Ambarnath|Bhusawal|Panvel|Badlapur|Beed|Gondia|Satara|Barshi|Yavatmal|Achalpur|Osmanabad|Nandurbar|Wardha|Udgir|Hinganghat|Ratnagiri|Baramati",
    "Manipur": "Imphal|Thoubal",
    "Meghalaya": "Shillong|Tura",
    "Mizoram": "Aizawl|Lunglei",
    "Nagaland": "Dimapur|Kohima",
    "Odisha": "Bhubaneswar|Cuttack|Rourkela|Berhampur|Sambalpur|Puri|Balasore|Bhadrak|Baripada|Jharsuguda|Jeypore|Bargarh|Rayagada|Angul|Kendujhar",
    "Punjab": "Ludhiana|Amritsar|Jalandhar|Patiala|Bathinda|Mohali|Hoshiarpur|Batala|Pathankot|Moga|Abohar|Malerkotla|Khanna|Phagwara|Muktsar|Barnala|Rajpura|Firozpur|Kapurthala|Zirakpur|Sangrur",
    "Rajasthan": "Jaipur|Jodhpur|Kota|Bikaner|Ajmer|Udaipur|Bhilwara|Alwar|Bharatpur|Sri Ganganagar|Sikar|Pali|Bhiwadi|Tonk|Kishangarh|Beawar|Hanumangarh|Dhaulpur|Gangapur City|Sawai Madhopur|Churu|Jhunjhunu|Baran|Chittorgarh|Pilani|Neemrana",
    "Sikkim": "Gangtok|Namchi",
    "Tamil Nadu": "Chennai|Coimbatore|Madurai|Tiruchirappalli|Salem|Tirunelveli|Tiruppur|Vellore|Erode|Thoothukudi|Dindigul|Thanjavur|Ranipet|Sivakasi|Karur|Udhagamandalam|Hosur|Nagercoil|Kanchipuram|Kumbakonam|Rajapalayam|Pudukkottai|Ambattur|Avadi|Tambaram|Pallavaram|Tiruvottiyur|Cuddalore|Tiruvannamalai|Pollachi|Nagapattinam|Karaikudi|Neyveli|Viluppuram|Gudiyatham|Vaniyambadi|Ambur|Sriperumbudur",
    "Telangana": "Hyderabad|Secunderabad|Warangal|Nizamabad|Karimnagar|Khammam|Ramagundam|Mahbubnagar|Nalgonda|Adilabad|Suryapet|Miryalaguda|Siddipet|Jagtial|Mancherial|Kothagudem",
    "Tripura": "Agartala|Udaipur",
    "Uttar Pradesh": "Lucknow|Kanpur|Ghaziabad|Agra|Meerut|Varanasi|Prayagraj|Bareilly|Aligarh|Moradabad|Saharanpur|Gorakhpur|Noida|Greater Noida|Firozabad|Jhansi|Muzaffarnagar|Mathura|Ayodhya|Rampur|Shahjahanpur|Farrukhabad|Mau|Hapur|Etawah|Mirzapur|Bulandshahr|Sambhal|Amroha|Hardoi|Fatehpur|Raebareli|Orai|Sitapur|Bahraich|Modinagar|Unnao|Jaunpur|Lakhimpur|Hathras|Banda|Pilibhit|Barabanki|Khurja|Gonda|Mainpuri|Lalitpur|Etah|Deoria|Ghazipur|Sultanpur|Azamgarh|Bijnor|Basti|Budaun|Loni|Ballia|Shamli|Kasganj",
    "Uttarakhand": "Dehradun|Haridwar|Haldwani|Roorkee|Rudrapur|Kashipur|Rishikesh|Nainital|Pantnagar",
    "West Bengal": "Kolkata|Howrah|Asansol|Siliguri|Durgapur|Bardhaman|Malda|Baharampur|Habra|Kharagpur|Shantipur|Dankuni|Haldia|Krishnanagar|Bally|Barasat|Kalyani|Bidhannagar|New Town|Bhatpara|Panihati|Kamarhati|Barrackpore|Naihati|Jalpaiguri|Bankura|Purulia|Medinipur|Raiganj|Cooch Behar|Balurghat|Darjeeling",
    "Andaman and Nicobar Islands": "Port Blair",
    "Chandigarh": "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu": "Daman|Silvassa|Diu",
    "Delhi": "New Delhi|Delhi",
    "Jammu and Kashmir": "Srinagar|Jammu|Anantnag|Baramulla|Sopore|Kathua|Udhampur",
    "Ladakh": "Leh|Kargil",
    "Lakshadweep": "Kavaratti",
    "Puducherry": "Puducherry|Karaikal|Yanam|Mahe",
  },
  US: {
    "Alabama": "Birmingham|Montgomery|Huntsville|Mobile|Tuscaloosa|Hoover|Auburn|Dothan",
    "Alaska": "Anchorage|Fairbanks|Juneau",
    "Arizona": "Phoenix|Tucson|Mesa|Chandler|Scottsdale|Glendale|Gilbert|Tempe|Peoria|Surprise|Flagstaff|Yuma",
    "Arkansas": "Little Rock|Fayetteville|Fort Smith|Springdale|Jonesboro|Rogers|Bentonville|Conway",
    "California": "Los Angeles|San Diego|San Jose|San Francisco|Fresno|Sacramento|Long Beach|Oakland|Bakersfield|Anaheim|Santa Ana|Riverside|Irvine|Stockton|Chula Vista|Fremont|San Bernardino|Santa Clara|Sunnyvale|Mountain View|Palo Alto|Menlo Park|Cupertino|Redwood City|San Mateo|Berkeley|Pasadena|Santa Monica|Torrance|Glendale|Huntington Beach|Oxnard|Modesto|Fontana|Ontario|Pleasanton|Milpitas|Santa Barbara|Santa Cruz|Burbank|Walnut Creek|El Segundo|Culver City|Foster City|South San Francisco|Emeryville|San Ramon|Thousand Oaks|Carlsbad|Redlands",
    "Colorado": "Denver|Colorado Springs|Aurora|Fort Collins|Lakewood|Boulder|Thornton|Arvada|Westminster|Pueblo|Broomfield|Englewood",
    "Connecticut": "Hartford|New Haven|Stamford|Bridgeport|Waterbury|Norwalk|Danbury|Greenwich",
    "Delaware": "Wilmington|Dover|Newark",
    "District of Columbia": "Washington",
    "Florida": "Jacksonville|Miami|Tampa|Orlando|St. Petersburg|Hialeah|Tallahassee|Fort Lauderdale|Port St. Lucie|Cape Coral|Pembroke Pines|Hollywood|Gainesville|Coral Springs|Boca Raton|West Palm Beach|Clearwater|Sarasota|Naples|Pensacola|Lakeland|Miramar",
    "Georgia": "Atlanta|Augusta|Columbus|Savannah|Athens|Sandy Springs|Macon|Roswell|Alpharetta|Marietta|Johns Creek|Peachtree Corners",
    "Hawaii": "Honolulu|Hilo|Kailua",
    "Idaho": "Boise|Meridian|Nampa|Idaho Falls|Pocatello|Coeur d'Alene",
    "Illinois": "Chicago|Aurora|Naperville|Joliet|Rockford|Springfield|Elgin|Peoria|Champaign|Urbana|Evanston|Schaumburg|Bloomington|Oak Brook|Deerfield|Northbrook",
    "Indiana": "Indianapolis|Fort Wayne|Evansville|South Bend|Carmel|Fishers|Bloomington|West Lafayette|Lafayette",
    "Iowa": "Des Moines|Cedar Rapids|Davenport|Iowa City|Ames|Sioux City|Waterloo",
    "Kansas": "Wichita|Overland Park|Kansas City|Olathe|Topeka|Lawrence|Manhattan",
    "Kentucky": "Louisville|Lexington|Bowling Green|Owensboro|Covington",
    "Louisiana": "New Orleans|Baton Rouge|Shreveport|Lafayette|Lake Charles|Metairie",
    "Maine": "Portland|Lewiston|Bangor|Augusta",
    "Maryland": "Baltimore|Columbia|Germantown|Silver Spring|Rockville|Bethesda|Frederick|Gaithersburg|Annapolis|College Park",
    "Massachusetts": "Boston|Worcester|Springfield|Cambridge|Lowell|Brockton|Quincy|Lynn|Newton|Somerville|Waltham|Burlington|Framingham|Woburn",
    "Michigan": "Detroit|Grand Rapids|Warren|Sterling Heights|Ann Arbor|Lansing|Dearborn|Flint|Troy|Kalamazoo|Novi|Farmington Hills|Southfield",
    "Minnesota": "Minneapolis|St. Paul|Rochester|Duluth|Bloomington|Brooklyn Park|Plymouth|Eden Prairie|Eagan",
    "Mississippi": "Jackson|Gulfport|Southaven|Hattiesburg|Biloxi",
    "Missouri": "Kansas City|St. Louis|Springfield|Columbia|Independence|Lee's Summit|Chesterfield",
    "Montana": "Billings|Missoula|Great Falls|Bozeman|Helena",
    "Nebraska": "Omaha|Lincoln|Bellevue|Grand Island",
    "Nevada": "Las Vegas|Henderson|Reno|North Las Vegas|Sparks|Carson City",
    "New Hampshire": "Manchester|Nashua|Concord|Portsmouth",
    "New Jersey": "Newark|Jersey City|Paterson|Elizabeth|Edison|Trenton|Hoboken|Princeton|Woodbridge|Parsippany|Piscataway|Iselin|Camden|New Brunswick|Morristown|Bridgewater",
    "New Mexico": "Albuquerque|Las Cruces|Rio Rancho|Santa Fe",
    "New York": "New York|Brooklyn|Queens|Bronx|Staten Island|Manhattan|Buffalo|Rochester|Yonkers|Syracuse|Albany|Ithaca|White Plains|Long Island City",
    "North Carolina": "Charlotte|Raleigh|Greensboro|Durham|Winston-Salem|Fayetteville|Cary|Wilmington|High Point|Asheville|Chapel Hill|Morrisville",
    "North Dakota": "Fargo|Bismarck|Grand Forks|Minot",
    "Ohio": "Columbus|Cleveland|Cincinnati|Toledo|Akron|Dayton|Parma|Canton|Dublin|Mason|Youngstown",
    "Oklahoma": "Oklahoma City|Tulsa|Norman|Broken Arrow|Edmond|Stillwater",
    "Oregon": "Portland|Salem|Eugene|Gresham|Hillsboro|Beaverton|Bend|Corvallis|Medford",
    "Pennsylvania": "Philadelphia|Pittsburgh|Allentown|Erie|Reading|Scranton|Bethlehem|Lancaster|Harrisburg|State College|King of Prussia|Malvern",
    "Rhode Island": "Providence|Warwick|Cranston|Pawtucket|Newport",
    "South Carolina": "Charleston|Columbia|North Charleston|Mount Pleasant|Rock Hill|Greenville|Spartanburg",
    "South Dakota": "Sioux Falls|Rapid City|Aberdeen",
    "Tennessee": "Nashville|Memphis|Knoxville|Chattanooga|Clarksville|Murfreesboro|Franklin|Brentwood",
    "Texas": "Houston|San Antonio|Dallas|Austin|Fort Worth|El Paso|Arlington|Corpus Christi|Plano|Laredo|Lubbock|Irving|Garland|Frisco|McKinney|Amarillo|Grand Prairie|Brownsville|Denton|Round Rock|Richardson|The Woodlands|Sugar Land|College Station|Waco|Midland|Odessa|Allen|Cedar Park",
    "Utah": "Salt Lake City|West Valley City|Provo|West Jordan|Orem|Sandy|Ogden|St. George|Lehi|Draper",
    "Vermont": "Burlington|South Burlington|Montpelier|Rutland",
    "Virginia": "Virginia Beach|Norfolk|Chesapeake|Richmond|Arlington|Newport News|Alexandria|Hampton|Roanoke|Charlottesville|Reston|Herndon|McLean|Fairfax|Tysons|Blacksburg|Lynchburg|Ashburn|Chantilly|Sterling",
    "Washington": "Seattle|Spokane|Tacoma|Vancouver|Bellevue|Kent|Everett|Renton|Redmond|Kirkland|Bothell|Olympia|Yakima|Federal Way|Issaquah|Sammamish|Bellingham",
    "West Virginia": "Charleston|Huntington|Morgantown|Parkersburg|Wheeling",
    "Wisconsin": "Milwaukee|Madison|Green Bay|Kenosha|Racine|Appleton|Waukesha|Eau Claire",
    "Wyoming": "Cheyenne|Casper|Laramie|Gillette",
    "Puerto Rico": "San Juan|Bayamón|Carolina|Ponce|Caguas|Mayagüez",
    "Guam": "Hagåtña|Dededo|Tamuning",
    "U.S. Virgin Islands": "Charlotte Amalie|Christiansted",
    "American Samoa": "Pago Pago",
    "Northern Mariana Islands": "Saipan",
  },
  CA: {
    "Alberta": "Calgary|Edmonton|Red Deer|Lethbridge|St. Albert|Medicine Hat|Grande Prairie|Airdrie|Spruce Grove|Sherwood Park|Fort McMurray",
    "British Columbia": "Vancouver|Surrey|Burnaby|Richmond|Abbotsford|Coquitlam|Kelowna|Langley|Saanich|Delta|Nanaimo|Kamloops|Victoria|North Vancouver|West Vancouver|Chilliwack|Maple Ridge|Prince George|New Westminster|Port Coquitlam",
    "Manitoba": "Winnipeg|Brandon|Steinbach|Thompson",
    "New Brunswick": "Moncton|Saint John|Fredericton|Dieppe|Miramichi",
    "Newfoundland and Labrador": "St. John's|Mount Pearl|Corner Brook|Conception Bay South|Grand Falls-Windsor",
    "Nova Scotia": "Halifax|Dartmouth|Sydney|Truro|New Glasgow",
    "Ontario": "Toronto|Ottawa|Mississauga|Brampton|Hamilton|London|Markham|Vaughan|Kitchener|Windsor|Richmond Hill|Oakville|Burlington|Greater Sudbury|Oshawa|Barrie|St. Catharines|Cambridge|Kingston|Guelph|Whitby|Waterloo|Ajax|Milton|Thunder Bay|Pickering|Niagara Falls|Newmarket|Peterborough|Brantford|Sarnia|Belleville|North York|Scarborough|Etobicoke",
    "Prince Edward Island": "Charlottetown|Summerside",
    "Quebec": "Montreal|Quebec City|Laval|Gatineau|Longueuil|Sherbrooke|Saguenay|Lévis|Trois-Rivières|Terrebonne|Brossard|Drummondville",
    "Saskatchewan": "Saskatoon|Regina|Prince Albert|Moose Jaw|Swift Current",
    "Northwest Territories": "Yellowknife|Hay River|Inuvik",
    "Nunavut": "Iqaluit|Rankin Inlet",
    "Yukon": "Whitehorse|Dawson City",
  },
  AU: {
    "Australian Capital Territory": "Canberra",
    "New South Wales": "Sydney|Newcastle|Wollongong|Central Coast|Parramatta|North Sydney|Penrith|Liverpool|Blacktown|Chatswood|Macquarie Park|Coffs Harbour|Wagga Wagga|Albury|Port Macquarie|Tamworth|Orange|Dubbo|Queanbeyan|Bathurst|Lismore",
    "Northern Territory": "Darwin|Alice Springs|Palmerston|Katherine",
    "Queensland": "Brisbane|Gold Coast|Sunshine Coast|Townsville|Cairns|Toowoomba|Mackay|Rockhampton|Bundaberg|Hervey Bay|Gladstone|Ipswich|Logan",
    "South Australia": "Adelaide|Mount Gambier|Whyalla|Murray Bridge|Port Augusta|Port Lincoln",
    "Tasmania": "Hobart|Launceston|Devonport|Burnie",
    "Victoria": "Melbourne|Geelong|Ballarat|Bendigo|Shepparton|Melton|Mildura|Warrnambool|Traralgon|Wodonga|Frankston|Dandenong",
    "Western Australia": "Perth|Fremantle|Joondalup|Rockingham|Mandurah|Bunbury|Kalgoorlie|Geraldton|Albany|Broome",
  },
  GB: {
    "England": "London|Birmingham|Manchester|Liverpool|Leeds|Sheffield|Bristol|Newcastle upon Tyne|Nottingham|Leicester|Coventry|Bradford|Southampton|Portsmouth|Plymouth|Reading|Brighton|Hull|Derby|Wolverhampton|Stoke-on-Trent|Milton Keynes|Northampton|Norwich|Oxford|Cambridge|York|Exeter|Bath|Cheltenham|Gloucester|Swindon|Luton|Peterborough|Ipswich|Bournemouth|Poole|Sunderland|Middlesbrough|Preston|Blackpool|Bolton|Salford|Stockport|Wigan|Huddersfield|Warrington|Slough|Watford|Guildford|Crawley|Basingstoke|Colchester|Chelmsford|Canterbury|Maidstone|Lincoln|Durham|Carlisle|Lancaster|Chester|Worcester|Hereford|Winchester|Salisbury|Bedford|St Albans|Stevenage|Harlow|Southend-on-Sea|Wakefield|Doncaster|Rotherham|Barnsley|Gateshead|Bracknell|Woking|Farnborough|Hemel Hempstead|High Wycombe",
    "Scotland": "Glasgow|Edinburgh|Aberdeen|Dundee|Inverness|Stirling|Perth|Paisley|East Kilbride|Livingston",
    "Wales": "Cardiff|Swansea|Newport|Wrexham|Bangor|Barry|Neath|Bridgend|St Asaph",
    "Northern Ireland": "Belfast|Derry|Lisburn|Newry|Armagh|Bangor|Newtownabbey|Craigavon",
  },
};

/** Other spellings people use for a city (old names, English names): spelling variant → the name in the lists. Both
 * spellings are fine to keep in a profile; this only lets the checks see they are the same place. */
const ALIASES: Record<string, string> = {
  bangalore: "Bengaluru", gurgaon: "Gurugram", bombay: "Mumbai", mysore: "Mysuru", mangalore: "Mangaluru",
  calcutta: "Kolkata", madras: "Chennai", trivandrum: "Thiruvananthapuram", cochin: "Kochi", poona: "Pune",
  baroda: "Vadodara", allahabad: "Prayagraj", benares: "Varanasi", banaras: "Varanasi", pondicherry: "Puducherry",
  pondy: "Puducherry", belgaum: "Belagavi", hubli: "Hubballi", "hubli dharwad": "Hubballi", "hubballi dharwad": "Hubballi",
  gulbarga: "Kalaburagi", bellary: "Ballari", tumkur: "Tumakuru", shimoga: "Shivamogga", bijapur: "Vijayapura",
  hospet: "Hosapete", vizag: "Visakhapatnam", calicut: "Kozhikode", trichy: "Tiruchirappalli", tiruchi: "Tiruchirappalli",
  tanjore: "Thanjavur", tuticorin: "Thoothukudi", ooty: "Udhagamandalam", rajamahendravaram: "Rajahmundry",
  anantapuramu: "Anantapur", "chhatrapati sambhajinagar": "Aurangabad", ahilyanagar: "Ahmednagar", dharashiv: "Osmanabad",
  faizabad: "Ayodhya", "english bazar": "Malda", brahmapur: "Berhampur", baleshwar: "Balasore",
  "sas nagar": "Mohali", "sahibzada ajit singh nagar": "Mohali", narmadapuram: "Hoshangabad", murwara: "Katni",
  "sri vijaya puram": "Port Blair", simla: "Shimla", thanesar: "Kurukshetra", "bokaro steel city": "Bokaro",
  "salt lake": "Bidhannagar", berhampore: "Baharampur", jullundur: "Jalandhar", cawnpore: "Kanpur", nasik: "Nashik",
  pimpri: "Pimpri-Chinchwad", chinchwad: "Pimpri-Chinchwad", vasai: "Vasai-Virar", virar: "Vasai-Virar",
  "mira road": "Mira-Bhayandar", bhayandar: "Mira-Bhayandar", "kalyan dombivli": "Kalyan",
  vasco: "Vasco da Gama", madgaon: "Margao", panjim: "Panaji",
  nyc: "New York", "new york city": "New York", "washington dc": "Washington", "washington d c": "Washington",
  "st louis": "St. Louis", "st paul": "St. Paul", philly: "Philadelphia",
  newcastle: "Newcastle upon Tyne", "kingston upon hull": "Hull", londonderry: "Derry", sudbury: "Greater Sudbury",
  quebec: "Quebec City", "montreal qc": "Montreal", stoke: "Stoke-on-Trent",
};

/** Lowercase, no accents, dots, apostrophes or hyphens; "Saint" as "st" ("St. John's" = "saint johns"). */
export function foldPlace(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/['’.]/g, "").replace(/[-‐–]/g, " ").replace(/\bsaint\b/g, "st").replace(/\s+/g, " ").trim();
}

interface CityEntry { name: string; country: string; state: string }

let index: { byKey: Map<string, CityEntry[]>; byState: Map<string, Map<string, string[]>>; aliases: Map<string, string> } | undefined;

function data() {
  if (index) return index;
  const byKey = new Map<string, CityEntry[]>();
  const byState = new Map<string, Map<string, string[]>>();
  for (const [country, states] of Object.entries(RAW)) {
    const stateMap = new Map<string, string[]>();
    for (const [state, list] of Object.entries(states)) {
      const cities = list.split("|");
      stateMap.set(state, cities);
      for (const name of cities) {
        const key = foldPlace(name);
        const entries = byKey.get(key) ?? [];
        entries.push({ name, country, state });
        byKey.set(key, entries);
      }
    }
    byState.set(country, stateMap);
  }
  const aliases = new Map<string, string>();
  for (const [alias, target] of Object.entries(ALIASES)) aliases.set(foldPlace(alias), foldPlace(target));
  index = { byKey, byState, aliases };
  return index;
}

/** The ISO codes of the countries with city lists. */
export const PLACE_COUNTRIES = ["IN", "US", "CA", "AU", "GB"] as const;

/** The states with city lists for a country (ISO code), in list order. */
export function placeStates(iso: string): string[] {
  return [...(data().byState.get(iso)?.keys() ?? [])];
}

/** Cities of one state (`state` is the state's full name), or of the whole country when no state is given, A to Z
 * without duplicates. Empty when the country has no city list. */
export function citiesIn(iso: string, state?: string): string[] {
  const states = data().byState.get(iso);
  if (!states) return [];
  const lists = state ? [states.get(state) ?? []] : [...states.values()];
  return [...new Set(lists.flat())].sort((a, b) => a.localeCompare(b));
}

/** The keys a typed city may be known by: as typed, the part before a comma or bracket ("Pune, Maharashtra",
 * "Bengaluru (Hybrid)"), and the listed name of a spelling variant ("Bangalore" → "bengaluru"). */
function cityKeys(value: string): string[] {
  const { aliases } = data();
  const raw = value.trim();
  if (!raw) return [];
  const heads = [raw, raw.split(/[,(/]| - /)[0]!];
  const keys = new Set<string>();
  for (const h of heads) {
    const k = foldPlace(h);
    if (!k) continue;
    keys.add(k);
    const alias = aliases.get(k);
    if (alias) keys.add(alias);
  }
  return [...keys];
}

/** Every listed place a typed city may be. */
function entriesFor(city: string): CityEntry[] {
  const { byKey } = data();
  const out: CityEntry[] = [];
  for (const k of cityKeys(city)) for (const e of byKey.get(k) ?? []) if (!out.includes(e)) out.push(e);
  return out;
}

/** True when the city is in the lists (any spelling variant). */
export function isListedCity(city: string): boolean {
  return entriesFor(city).length > 0;
}

/** The countries (ISO codes) whose lists have this city. */
export function countriesOfCity(city: string): string[] {
  return [...new Set(entriesFor(city).map((e) => e.country))];
}

/** The states of a country (ISO code) whose lists have this city. */
export function statesOfCity(iso: string, city: string): string[] {
  return [...new Set(entriesFor(city).filter((e) => e.country === iso).map((e) => e.state))];
}

/** True when two typed cities are the same place by name ("Bangalore" and "Bengaluru", "Gurgaon" and "Gurugram"). */
export function sameCity(a: string, b: string): boolean {
  const ka = cityKeys(a);
  const kb = new Set(cityKeys(b));
  return ka.some((k) => kb.has(k));
}
