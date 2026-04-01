import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { z } from "zod";
import fs from "fs";
import path from "path";

function getRegionalFoodDomains(lat: number, lng: number): string {
  // Hong Kong
  if (lat >= 22.1 && lat <= 22.6 && lng >= 113.8 && lng <= 114.5)
    return "site:openrice.com OR site:tripadvisor.com";
  // Mainland China
  if (lat >= 18 && lat <= 53 && lng >= 73 && lng <= 135)
    return "site:dianping.com OR site:tripadvisor.com";
  // Japan
  if (lat >= 30 && lat <= 45 && lng >= 129 && lng <= 146)
    return "site:tabelog.com OR site:gurunavi.com OR site:tripadvisor.com";
  // South Korea
  if (lat >= 33 && lat <= 38.5 && lng >= 125 && lng <= 130)
    return "site:mangoplate.com OR site:tripadvisor.com";
  // Taiwan
  if (lat >= 21.5 && lat <= 25.5 && lng >= 119 && lng <= 122.5)
    return "site:openrice.com OR site:tripadvisor.com";
  // Singapore
  if (lat >= 1.1 && lat <= 1.5 && lng >= 103.6 && lng <= 104.1)
    return "site:burpple.com OR site:hungrygowhere.com OR site:tripadvisor.com";
  // Thailand
  if (lat >= 5 && lat <= 21 && lng >= 97 && lng <= 106)
    return "site:wongnai.com OR site:tripadvisor.com";
  // Vietnam
  if (lat >= 8 && lat <= 23.5 && lng >= 102 && lng <= 110)
    return "site:foody.vn OR site:tripadvisor.com";
  // Southeast Asia (Malaysia, Indonesia, Philippines)
  if (lat >= -11 && lat <= 20 && lng >= 95 && lng <= 141)
    return "site:zomato.com OR site:tripadvisor.com";
  // India
  if (lat >= 8 && lat <= 37 && lng >= 68 && lng <= 97)
    return "site:zomato.com OR site:tripadvisor.com";
  // Australia / NZ
  if (lat >= -47 && lat <= -10 && lng >= 113 && lng <= 178)
    return "site:zomato.com OR site:tripadvisor.com";
  // UK & Ireland
  if (lat >= 49 && lat <= 61 && lng >= -11 && lng <= 2)
    return "site:thefork.com OR site:tripadvisor.com";
  // Europe
  if (lat >= 35 && lat <= 72 && lng >= -10 && lng <= 40)
    return "site:thefork.com OR site:tripadvisor.com";
  // USA & Canada
  if (lat >= 24 && lat <= 72 && lng >= -168 && lng <= -52)
    return "site:yelp.com OR site:opentable.com OR site:tripadvisor.com";
  // Mexico & Latin America
  if (lat >= -55 && lat <= 33 && lng >= -118 && lng <= -34)
    return "site:tripadvisor.com OR site:yelp.com";
  // Middle East
  if (lat >= 12 && lat <= 42 && lng >= 25 && lng <= 63)
    return "site:zomato.com OR site:tripadvisor.com";
  // Global fallback
  return "site:tripadvisor.com OR site:yelp.com OR site:zomato.com";
}

// File-backed cache: placeId → food image URL (persists across server restarts)
const CACHE_FILE = path.resolve(process.cwd(), ".cache/food-images.json");

function loadCache(): Map<string, string> {
  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    return new Map(Object.entries(JSON.parse(raw) as Record<string, string>));
  } catch {
    return new Map();
  }
}

function saveCache(cache: Map<string, string>): void {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(Object.fromEntries(cache), null, 2));
  } catch (err) {
    console.error("Failed to save food image cache:", err);
  }
}

const foodImageCache = loadCache();

// Search Google Images via Serper.dev for a real food photo of a restaurant
async function searchFoodImage(restaurantName: string, cuisine: string, serperApiKey: string, lat: number, lng: number): Promise<string | null> {
  if (!serperApiKey) return null;
  try {
    const res = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: {
        "X-API-KEY": serperApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: `${restaurantName} ${cuisine} food dish ${getRegionalFoodDomains(lat, lng)}`,
        num: 3,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { images?: { imageUrl: string }[] };
    return data.images?.[0]?.imageUrl ?? null;
  } catch {
    return null;
  }
}

const CUISINE_MAP: Record<string, string> = {
  // Western
  italian_restaurant: "Italian",
  american_restaurant: "American",
  french_restaurant: "French",
  mediterranean_restaurant: "Mediterranean",
  greek_restaurant: "Greek",
  spanish_restaurant: "Spanish",
  // Asian
  japanese_restaurant: "Japanese",
  chinese_restaurant: "Chinese",
  mexican_restaurant: "Mexican",
  thai_restaurant: "Thai",
  indian_restaurant: "Indian",
  korean_restaurant: "Korean",
  vietnamese_restaurant: "Vietnamese",
  middle_eastern_restaurant: "Middle Eastern",
  // Asian (new Places API types)
  asian_restaurant: "Chinese",
  chinese_food_restaurant: "Chinese",
  dim_sum_restaurant: "Chinese",
  cantonese_restaurant: "Chinese",
  shanghainese_restaurant: "Chinese",
  szechuan_restaurant: "Chinese",
  noodle_restaurant: "Chinese",
  ramen_restaurant: "Japanese",
  izakaya_restaurant: "Japanese",
  teppanyaki_restaurant: "Japanese",
  sushi_restaurant: "Sushi",
  // Specialty
  seafood_restaurant: "Seafood",
  steak_house: "Steakhouse",
  pizza_restaurant: "Pizza",
  hamburger_restaurant: "Burgers",
  dessert_shop: "Desserts",
  bakery: "Desserts",
};

const BRAND_MAP: Record<string, string> = {
  // Fried chicken
  "kfc": "Fried Chicken", "popeyes": "Fried Chicken", "chick-fil-a": "Fried Chicken",
  "jollibee": "Fried Chicken", "church's": "Fried Chicken",
  // Burgers
  "mcdonald": "Burgers", "burger king": "Burgers", "wendy": "Burgers",
  "five guys": "Burgers", "shake shack": "Burgers", "in-n-out": "Burgers",
  "carl's jr": "Burgers", "hardee": "Burgers", "whataburger": "Burgers",
  "smashburger": "Burgers", "fatburger": "Burgers",
  // Pizza
  "pizza hut": "Pizza", "domino": "Pizza", "papa john": "Pizza",
  "little caesar": "Pizza", "papa murphy": "Pizza",
  // Mexican
  "taco bell": "Mexican", "chipotle": "Mexican", "qdoba": "Mexican",
  "del taco": "Mexican", "moe's": "Mexican",
  // Sandwiches / Subs
  "subway": "Sandwiches", "jimmy john": "Sandwiches", "jersey mike": "Sandwiches",
  "firehouse": "Sandwiches", "quizno": "Sandwiches", "potbelly": "Sandwiches",
  // Coffee / Café
  "starbucks": "Café", "costa coffee": "Café", "tim horton": "Café",
  "dunkin": "Café", "peet": "Café", "caribou": "Café",
  // Asian chains
  "panda express": "Chinese", "pf chang": "Chinese",
  "yoshinoya": "Japanese", "mos burger": "Japanese",
  // Steakhouse
  "outback": "Steakhouse", "sizzler": "Steakhouse", "texas de brazil": "Steakhouse",
  "longhorn": "Steakhouse", "ruth's chris": "Steakhouse", "benihana": "Japanese",
  // Desserts / Ice cream
  "dairy queen": "Desserts", "baskin-robbins": "Desserts", "cold stone": "Desserts",
  "haagen-dazs": "Desserts", "krispy kreme": "Desserts", "cinnabon": "Desserts",
  // Other
  "olive garden": "Italian", "red lobster": "Seafood",
  "denny": "American", "ihop": "American", "waffle house": "American",
  "cheesecake factory": "American", "applebee": "American", "chili's": "American",
};

function guessFromName(name: string): string | null {
  const n = name.toLowerCase();

  // Check brand map first (exact substring match)
  for (const [brand, cuisine] of Object.entries(BRAND_MAP)) {
    if (n.includes(brand)) return cuisine;
  }

  if (/sushi|ramen|izakaya|tempura|yakitori|teppanyaki|udon|soba|tonkatsu|wagyu|kaiseki|bento|donburi|gyoza|takoyaki|japanese|sakura|tokyo|osaka|kyoto/.test(n)) return "Japanese";
  if (/dim.?sum|wonton|dumpling|congee|peking|szechuan|sichuan|cantonese|shanghainese|chinese|hongkong|hong.?kong|malatang|hot.?pot|xiaolongbao/.test(n)) return "Chinese";
  if (/korean|bulgogi|bibimbap|kimchi|galbi|jjigae|kbbq/.test(n)) return "Korean";
  if (/\bthai\b|pad.?thai|tom.?yum|green.?curry|thai.?basil|satay/.test(n)) return "Thai";
  if (/\bpho\b|vietnamese|viet\b|banh.?mi|bun bo|saigon|hanoi/.test(n)) return "Vietnamese";
  if (/\bindian\b|curry|tandoor|masala|biryani|\bnaan\b|tikka|punjabi|dosa|samosa/.test(n)) return "Indian";
  if (/pizza|pasta|ristorante|trattoria|osteria|gelato|pizzeria|napoli|italian|cannoli/.test(n)) return "Italian";
  if (/\btaco\b|burrito|mexican|quesadilla|enchilada|guacamole|cantina|taqueria/.test(n)) return "Mexican";
  if (/\bburger\b|steakhouse|smokehouse|barbecue|\bbbq\b|wings|fried.?chicken/.test(n)) return "American";
  if (/french|brasserie|bistro|cr[eê]pe|boulangerie|p[aâ]tisserie|\bparis\b/.test(n)) return "French";
  if (/mediterranean|greek|hummus|falafel|kebab|shawarma|gyros|lebanese|turkish|mezze/.test(n)) return "Mediterranean";
  if (/seafood|oyster|lobster|\bcrab\b|\bfish\b|\bprawn\b|sashimi/.test(n)) return "Seafood";
  if (/dessert|patisserie|waffle|ice.?cream|creamery|frozen.?yogurt/.test(n)) return "Desserts";
  if (/\bcafe\b|coffee|espresso|\bbrew\b|roaster/.test(n)) return "Café";
  if (/\bbakery\b|boulangerie|bread|pastry/.test(n)) return "Bakery";
  if (/noodle|ramen|udon|soba/.test(n)) return "Noodles";
  if (/fast.?food|quick.?serve/.test(n)) return "Fast Food";
  return null;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  places: router({
    autocomplete: publicProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ input }) => {
        const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
        url.searchParams.set("input", input.query);
        url.searchParams.set("types", "(regions)");
        url.searchParams.set("key", ENV.googlePlacesApiKey);

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error("Google Places request failed");
        const data = await res.json() as {
          predictions: { place_id: string; description: string }[];
        };
        return data.predictions.map((p) => ({
          placeId: p.place_id,
          description: p.description,
        }));
      }),

    details: publicProcedure
      .input(z.object({ placeId: z.string() }))
      .query(async ({ input }) => {
        const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
        url.searchParams.set("place_id", input.placeId);
        url.searchParams.set("fields", "geometry,name,formatted_address");
        url.searchParams.set("key", ENV.googlePlacesApiKey);

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error("Google Places details request failed");
        const data = await res.json() as {
          result: {
            name: string;
            formatted_address: string;
            geometry: { location: { lat: number; lng: number } };
          };
        };
        return {
          lat: data.result.geometry.location.lat,
          lng: data.result.geometry.location.lng,
          cityName: data.result.formatted_address,
        };
      }),

    restaurantDetails: publicProcedure
      .input(z.object({ placeId: z.string() }))
      .query(async ({ input, ctx }) => {
        const reqProto = (ctx.req.headers["x-forwarded-proto"] as string) || (ctx.req.socket && (ctx.req.socket as any).encrypted ? "https" : "http");
        const reqHost = ctx.req.headers.host ?? "localhost:3000";
        const serverBase = `${reqProto}://${reqHost}`;

        // New Places API v1 — reviews include originalText (original language, no forced translation)
        const res = await fetch(
          `https://places.googleapis.com/v1/places/${input.placeId}`,
          {
            headers: {
              "X-Goog-Api-Key": ENV.googlePlacesApiKey,
              "X-Goog-FieldMask": "formattedPhoneNumber,websiteUri,regularOpeningHours,reviews,photos",
            },
          }
        );
        if (!res.ok) throw new Error("Places API v1 details request failed");

        type NewPlaceDetail = {
          formattedPhoneNumber?: string;
          websiteUri?: string;
          regularOpeningHours?: { weekdayDescriptions?: string[] };
          photos?: { name: string }[];
          reviews?: {
            relativePublishTimeDescription: string;
            rating: number;
            text?: { text: string };
            originalText?: { text: string };
            authorAttribution: { displayName: string; photoUri?: string };
          }[];
        };
        const data = await res.json() as NewPlaceDetail;

        const detailPhotos = (data.photos ?? []).map(
          (p) => `${serverBase}/api/places/photo?ref=${encodeURIComponent(p.name)}`
        );

        return {
          phone: data.formattedPhoneNumber ?? null,
          website: data.websiteUri ?? null,
          weekdayText: data.regularOpeningHours?.weekdayDescriptions ?? null,
          photos: detailPhotos,
          reviews: (data.reviews ?? []).map((r) => ({
            author: r.authorAttribution.displayName,
            rating: r.rating,
            // Prefer originalText so reviews show in the language they were written
            text: r.originalText?.text ?? r.text?.text ?? "",
            time: r.relativePublishTimeDescription,
            avatar: r.authorAttribution.photoUri ?? null,
          })),
        };
      }),

    nearbyRestaurants: publicProcedure
      .input(z.object({
        lat: z.number(),
        lng: z.number(),
        radius: z.number().default(2000),
        pageToken: z.string().optional(),
        language: z.enum(['en', 'es', 'ja', 'zh-HK']).default('en'),
      }))
      .query(async ({ input, ctx }) => {
        const reqProto = (ctx.req.headers["x-forwarded-proto"] as string) || (ctx.req.socket && (ctx.req.socket as any).encrypted ? "https" : "http");
        const reqHost = ctx.req.headers.host ?? "localhost:3000";
        const serverBase = `${reqProto}://${reqHost}`;

        type NewGPlace = {
          id: string;
          displayName: { text: string };
          types: string[];
          rating?: number;
          userRatingCount?: number;
          priceLevel?: string;
          currentOpeningHours?: { openNow: boolean };
          photos?: { name: string; widthPx: number; heightPx: number }[];
          shortFormattedAddress?: string;
          formattedAddress?: string;
          location: { latitude: number; longitude: number };
        };

        const PRICE_LEVEL_MAP: Record<string, number> = {
          PRICE_LEVEL_FREE: 1,
          PRICE_LEVEL_INEXPENSIVE: 1,
          PRICE_LEVEL_MODERATE: 2,
          PRICE_LEVEL_EXPENSIVE: 3,
          PRICE_LEVEL_VERY_EXPENSIVE: 4,
        };

        // Language code mapping for Google API
        const langCodeMap: Record<string, string> = {
          'en': 'en',
          'es': 'es',
          'ja': 'ja',
          'zh-HK': 'zh-TW', // Google uses zh-TW for Traditional Chinese
        };

        // New Places API v1 — returns photos in Google's editorial order (特色/featured first)
        const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": ENV.googlePlacesApiKey,
            "X-Goog-FieldMask": "places.id,places.displayName,places.types,places.rating,places.userRatingCount,places.priceLevel,places.currentOpeningHours,places.photos,places.shortFormattedAddress,places.formattedAddress,places.location",
          },
          body: JSON.stringify({
            locationRestriction: {
              circle: { center: { latitude: input.lat, longitude: input.lng }, radius: input.radius },
            },
            includedTypes: ["restaurant"],
            maxResultCount: 20,
            pageToken: input.pageToken,
            languageCode: langCodeMap[input.language],
          }),
        });
        if (!res.ok) throw new Error("Places API v1 nearby search failed");
        const data = await res.json() as { places?: NewGPlace[] };
        const places = data.places ?? [];

        const restaurants = await Promise.all(places.map(async (place) => {
          const cuisines = (place.types ?? [])
            .map((t) => CUISINE_MAP[t])
            .filter((c): c is string => !!c);
          if (cuisines.length === 0) {
            const guessed = guessFromName(place.displayName?.text ?? "");
            if (guessed) cuisines.push(guessed);
          }

          // New API returns photos in editorial order — 特色 photos come first
          const placePhotos = place.photos ?? [];
          let photos = placePhotos.map(
            (p) => `${serverBase}/api/places/photo?ref=${encodeURIComponent(p.name)}`
          );

          // If all photos are landscape (storefront/interior), try Serper for a real food image
          const hasPortrait = placePhotos.some((p) => p.widthPx / (p.heightPx || 1) <= 1.3);
          if (!hasPortrait) {
            const cached = foodImageCache.get(place.id);
            if (cached) {
              photos = [cached, ...photos];
            } else {
              const foodImage = await searchFoodImage(
                place.displayName?.text ?? "",
                cuisines[0] ?? "food",
                ENV.serperApiKey,
                place.location.latitude,
                place.location.longitude
              );
              if (foodImage) {
                foodImageCache.set(place.id, foodImage);
                saveCache(foodImageCache);
                photos = [foodImage, ...photos];
              }
            }
          }
          if (!photos.length) photos = ["https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800"];

          // Randomly pick hero from the first 3 editorial photos
          const poolSize = Math.min(3, photos.length);
          const imageUrl = photos[Math.floor(Math.random() * poolSize)];

          return {
            id: place.id,
            name: place.displayName?.text ?? "",
            nameLocalized: {
              [input.language]: place.displayName?.text ?? "",
            },
            cuisine: cuisines as string[],
            rating: place.rating ?? 4.0,
            reviewCount: place.userRatingCount ?? 0,
            priceLevel: Math.max(1, Math.min(4, PRICE_LEVEL_MAP[place.priceLevel ?? ""] ?? 2)) as 1 | 2 | 3 | 4,
            distance: Math.round(haversineKm(input.lat, input.lng, place.location.latitude, place.location.longitude) * 10) / 10,
            imageUrl,
            photos,
            address: place.shortFormattedAddress ?? place.formattedAddress ?? "",
            isOpen: place.currentOpeningHours?.openNow ?? true,
            lat: place.location.latitude,
            lng: place.location.longitude,
          };
        }));

        // New API doesn't use page tokens; fetchMoreRestaurants handles pagination via random offsets
        return { restaurants, nextPageToken: null };
      }),
  }),
});

export type AppRouter = typeof appRouter;
