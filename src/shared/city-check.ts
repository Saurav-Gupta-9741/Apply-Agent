/** A gentle check of the city the user types in their profile: forms get it exactly as typed, so a typo
 * ("Banglore") is filled on every application. Suggests the known spelling; never changes the value itself. */

import { levenshteinDistance } from "./option-matcher";

/** Cities job forms commonly list, as they are usually spelled. Several spellings of one city are all fine. */
export const KNOWN_CITIES: string[] = [
  // India
  "Bengaluru", "Bangalore", "Hyderabad", "Pune", "Mumbai", "Navi Mumbai", "Thane", "Delhi", "New Delhi", "Gurugram", "Gurgaon",
  "Noida", "Greater Noida", "Faridabad", "Ghaziabad", "Chennai", "Kolkata", "Ahmedabad", "Gandhinagar", "Surat", "Vadodara",
  "Jaipur", "Jodhpur", "Udaipur", "Kochi", "Cochin", "Thiruvananthapuram", "Trivandrum", "Kozhikode", "Chandigarh", "Mohali",
  "Indore", "Bhopal", "Coimbatore", "Madurai", "Tiruchirappalli", "Mysuru", "Mysore", "Mangaluru", "Mangalore", "Hubli",
  "Visakhapatnam", "Vijayawada", "Nagpur", "Nashik", "Aurangabad", "Lucknow", "Kanpur", "Varanasi", "Prayagraj", "Allahabad",
  "Patna", "Ranchi", "Jamshedpur", "Bhubaneswar", "Raipur", "Guwahati", "Dehradun", "Ludhiana", "Amritsar", "Srinagar",
  "Jammu", "Goa", "Panaji", "Puducherry", "Agra", "Meerut", "Kota", "Ajmer", "Shimla", "Siliguri", "Warangal", "Kharagpur",
  "Roorkee", "Manipal", "Vellore", "Salem", "Rajkot",
  // Elsewhere
  "New York", "San Francisco", "Seattle", "Austin", "Boston", "Chicago", "Los Angeles", "Denver", "Atlanta", "Washington",
  "San Jose", "Palo Alto", "Mountain View", "Sunnyvale", "Redmond", "Miami", "Dallas", "Houston", "Philadelphia", "Pittsburgh",
  "Portland", "Raleigh", "London", "Manchester", "Edinburgh", "Cambridge", "Bristol", "Leeds", "Glasgow", "Belfast", "Toronto",
  "Vancouver", "Montreal", "Ottawa", "Calgary", "Waterloo", "Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne", "Stuttgart",
  "Paris", "Amsterdam", "Rotterdam", "Dublin", "Madrid", "Barcelona", "Warsaw", "Krakow", "Singapore", "Sydney", "Melbourne",
  "Brisbane", "Perth", "Dubai", "Abu Dhabi", "Tokyo", "Osaka", "Remote",
];

const KNOWN = new Map(KNOWN_CITIES.map((c) => [c.toLowerCase(), c]));

/** "Did you mean …?" for a city that is one or two letters off a known spelling; undefined when it is known or far
 * from every known city (a small town is fine as typed). */
export function citySuggestion(value: string): string | undefined {
  const v = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (!v || KNOWN.has(v)) return undefined;
  // "Pune, Maharashtra" or "Bengaluru (Hybrid)": the city part decides.
  const head = v.split(/[,(/-]/)[0]!.trim();
  if (KNOWN.has(head)) return undefined;
  if (head.length < 4) return undefined;
  let best: { city: string; d: number } | undefined;
  for (const [lower, city] of KNOWN) {
    if (Math.abs(lower.length - head.length) > 2) continue;
    const d = levenshteinDistance(head, lower);
    if (d <= (head.length >= 7 ? 2 : 1) && (!best || d < best.d)) best = { city, d };
  }
  return best?.city;
}
