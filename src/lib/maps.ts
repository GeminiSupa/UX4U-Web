const USER_AGENT = "UX4UStudio/1.0 (info@ux4u.online)";

export const mapCategories = [
  { id: "restaurant", label: "Restaurants", match: '[amenity=restaurant]' },
  { id: "cafe", label: "Cafes", match: '[amenity=cafe]' },
  { id: "hotel", label: "Hotels", match: '[tourism=hotel]' },
  { id: "clinic", label: "Clinics", match: '[amenity~"^(clinic|doctors)$"]' },
  { id: "dentist", label: "Dentists", match: '[amenity=dentist]' },
  { id: "pharmacy", label: "Pharmacies", match: '[amenity=pharmacy]' },
  { id: "school", label: "Schools", match: '[amenity=school]' },
  { id: "lawyer", label: "Law firms", match: '[office=lawyer]' },
  { id: "estate", label: "Real estate", match: '[office=estate_agent]' },
  { id: "gym", label: "Gyms", match: '[leisure=fitness_centre]' },
  { id: "salon", label: "Salons", match: '[shop~"^(hairdresser|beauty)$"]' },
  { id: "shop", label: "Shops", match: '[shop]' }
] as const;

export type MapPlace = {
  id: string;
  business_name: string;
  website: string;
  phones: string;
  emails: string;
  city: string;
  category: string;
  address: string;
  source_url: string;
};

type OverpassElement = {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

function categoryById(id: string) {
  return mapCategories.find((item) => item.id === id) || mapCategories[0];
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tag(tags: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = tags[key]?.trim();
    if (value) return value;
  }
  return "";
}

function websiteOf(tags: Record<string, string>) {
  const raw = tag(tags, ["website", "contact:website", "url"]);
  if (!raw) return "";
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.origin;
  } catch {
    return "";
  }
}

type PlacePoint = { name: string; lat: number; lon: number };

async function locate(city: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", city);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error("The map could not find that place. Try again in a moment.");
  const rows = (await response.json()) as {
    lat?: string;
    lon?: string;
    boundingbox?: string[];
    addresstype?: string;
    name?: string;
  }[];
  const row = rows[0];
  const lat = Number(row?.lat);
  const lon = Number(row?.lon);
  const box = (row?.boundingbox || []).map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || box.length < 4 || box.some((value) => Number.isNaN(value))) {
    throw new Error("No place matched that name. Add the country, such as Islamabad, Pakistan.");
  }
  const [south, north, west, east] = box;
  const wide = north - south > 1.2 || east - west > 1.2 || ["state", "country"].includes(row?.addresstype || "");
  return { lat, lon, south, north, west, east, wide, label: row?.name || city };
}

function searchPoints(place: Awaited<ReturnType<typeof locate>>): { points: PlacePoint[]; note: string } {
  if (!place.wide) return { points: [{ name: place.label, lat: place.lat, lon: place.lon }], note: "" };
  const inside = cityAnchors
    .filter(([, lat, lon]) => lat >= place.south && lat <= place.north && lon >= place.west && lon <= place.east)
    .slice(0, 6);
  if (!inside.length) {
    throw new Error(`${place.label} is too large for one search. Name a city inside it.`);
  }
  return {
    points: inside.map(([name, lat, lon]) => ({ name, lat, lon })),
    note: `${place.label} is a large area, so these listings are from ${inside.map(([name]) => name).join(", ")}.`
  };
}

const overpassEndpoints = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter"
];

const cityAnchors: [string, number, number][] = [
  ["New York", 40.71, -74.01],
  ["Los Angeles", 34.05, -118.24],
  ["Chicago", 41.88, -87.63],
  ["Houston", 29.76, -95.37],
  ["Miami", 25.76, -80.19],
  ["Seattle", 47.61, -122.33],
  ["San Diego", 32.72, -117.16],
  ["San Jose", 37.34, -121.89],
  ["San Francisco", 37.77, -122.42],
  ["Sacramento", 38.58, -121.49],
  ["Fresno", 36.74, -119.79],
  ["Oakland", 37.8, -122.27],
  ["Phoenix", 33.45, -112.07],
  ["Dallas", 32.78, -96.8],
  ["Austin", 30.27, -97.74],
  ["San Antonio", 29.42, -98.49],
  ["Fort Worth", 32.76, -97.33],
  ["Denver", 39.74, -104.99],
  ["Boston", 42.36, -71.06],
  ["Atlanta", 33.75, -84.39],
  ["Philadelphia", 39.95, -75.17],
  ["Washington", 38.91, -77.04],
  ["Las Vegas", 36.17, -115.14],
  ["Portland", 45.52, -122.68],
  ["Minneapolis", 44.98, -93.27],
  ["Detroit", 42.33, -83.05],
  ["Nashville", 36.16, -86.78],
  ["Charlotte", 35.23, -80.84],
  ["Orlando", 28.54, -81.38],
  ["London", 51.51, -0.13],
  ["Manchester", 53.48, -2.24],
  ["Birmingham", 52.48, -1.9],
  ["Paris", 48.86, 2.35],
  ["Lyon", 45.76, 4.84],
  ["Berlin", 52.52, 13.4],
  ["Hamburg", 53.55, 9.99],
  ["Munich", 48.14, 11.58],
  ["Frankfurt", 50.11, 8.68],
  ["Cologne", 50.94, 6.96],
  ["Stuttgart", 48.78, 9.18],
  ["Düsseldorf", 51.23, 6.78],
  ["Leipzig", 51.34, 12.37],
  ["Dresden", 51.05, 13.74],
  ["Nuremberg", 49.45, 11.08],
  ["Madrid", 40.42, -3.7],
  ["Barcelona", 41.39, 2.17],
  ["Rome", 41.89, 12.48],
  ["Milan", 45.46, 9.19],
  ["Dubai", 25.2, 55.27],
  ["Abu Dhabi", 24.45, 54.38],
  ["Sharjah", 25.35, 55.39],
  ["Karachi", 24.86, 67.01],
  ["Lahore", 31.52, 74.36],
  ["Islamabad", 33.69, 73.06],
  ["Rawalpindi", 33.6, 73.04],
  ["Faisalabad", 31.42, 73.08],
  ["Delhi", 28.61, 77.21],
  ["Mumbai", 19.08, 72.88],
  ["Bangalore", 12.97, 77.59],
  ["Toronto", 43.65, -79.38],
  ["Vancouver", 49.28, -123.12],
  ["Sydney", -33.87, 151.21],
  ["Melbourne", -37.81, 144.96],
  ["Brisbane", -27.47, 153.03],
  ["Perth", -31.95, 115.86],
  ["Adelaide", -34.93, 138.6],
  ["Gold Coast", -28.02, 153.4],
  ["Canberra", -35.28, 149.13],
  ["Hobart", -42.88, 147.33],
  ["Newcastle", -32.93, 151.78]
];

export async function searchMap(input: {
  category: string;
  city: string;
  keyword: string;
  needPhone: boolean;
  needWebsite: boolean;
}): Promise<{ places: MapPlace[]; note: string }> {
  const city = input.city.trim();
  if (city.length < 2) throw new Error("Add a city or state to search.");
  const chosen = categoryById(input.category);
  const located = await locate(city);
  const { points, note } = searchPoints(located);
  const keyword = input.keyword.trim().slice(0, 40);
  const nameFilter = keyword ? `["name"~"${escapeRegex(keyword)}",i]` : "";
  const radius = points.length > 3 ? 2500 : 4000;
  const clauses = points
    .map((point) => `nwr${chosen.match}${nameFilter}(around:${radius},${point.lat},${point.lon});`)
    .join("");
  const query = `[out:json][timeout:12];(${clauses});out tags center 24;`;
  let payload: { elements?: OverpassElement[] } | null = null;
  let lastStatus = 0;
  for (const endpoint of overpassEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
          Accept: "application/json"
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(14000)
      });
      lastStatus = response.status;
      if (response.ok) {
        payload = (await response.json()) as { elements?: OverpassElement[] };
        break;
      }
      if (response.status !== 429 && response.status !== 504) break;
    } catch {
      lastStatus = 504;
    }
  }
  if (!payload) {
    if (lastStatus === 429 || lastStatus === 504) {
      throw new Error("The free map service is busy. Wait a minute and search again.");
    }
    throw new Error("The map search did not answer. Try another category.");
  }
  const seen = new Set<string>();
  const places: MapPlace[] = [];
  for (const element of payload.elements || []) {
    const tags = element.tags || {};
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    const nearest = points.reduce((best, point) => {
      if (lat == null || lon == null) return best;
      const distance = (point.lat - lat) ** 2 + (point.lon - lon) ** 2;
      return distance < best.distance ? { name: point.name, distance } : best;
    }, { name: city, distance: Infinity }).name;
    const business_name = tag(tags, ["name", "brand"]);
    if (!business_name || !element.type || !element.id) continue;
    const phones = [tag(tags, ["phone", "contact:phone"]), tag(tags, ["mobile", "contact:mobile"])]
      .filter(Boolean)
      .join("; ");
    const website = websiteOf(tags);
    if (input.needPhone && !phones) continue;
    if (input.needWebsite && !website) continue;
    const key = `${business_name.toLowerCase()}|${phones}|${website}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const street = [tag(tags, ["addr:housenumber"]), tag(tags, ["addr:street"])].filter(Boolean).join(" ");
    places.push({
      id: `${element.type}/${element.id}`,
      business_name: business_name.slice(0, 120),
      website,
      phones,
      emails: tag(tags, ["email", "contact:email"]).toLowerCase(),
      city: tag(tags, ["addr:city"]) || nearest,
      category: chosen.label,
      address: street,
      source_url: `https://www.openstreetmap.org/${element.type}/${element.id}`
    });
    if (places.length >= 25) break;
  }
  return { places, note };
}
