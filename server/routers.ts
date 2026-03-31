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

        const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
        url.searchParams.set("place_id", input.placeId);
        url.searchParams.set("fields", "formatted_phone_number,website,opening_hours,reviews,photos");
        url.searchParams.set("key", ENV.googlePlacesApiKey);

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error("Google Places details request failed");
        const data = await res.json() as {
          result: {
            formatted_phone_number?: string;
            website?: string;
            opening_hours?: { weekday_text?: string[] };
            photos?: { photo_reference: string }[];
            reviews?: {
              author_name: string;
              rating: number;
              text: string;
              relative_time_description: string;
              profile_photo_url?: string;
            }[];
          };
        };

        const detailPhotos = (data.result?.photos ?? []).map(
          (p) => `${serverBase}/api/places/photo?ref=${encodeURIComponent(p.photo_reference)}`
        );

        return {
          phone: data.result?.formatted_phone_number ?? null,
          website: data.result?.website ?? null,
          weekdayText: data.result?.opening_hours?.weekday_text ?? null,
          photos: detailPhotos,
          reviews: (data.result?.reviews ?? []).map((r) => ({
            author: r.author_name,
            rating: r.rating,
            text: r.text,
            time: r.relative_time_description,
            avatar: r.profile_photo_url ?? null,
          })),
        };
      }),

    nearbyRestaurants: publicProcedure
      .input(z.object({
        lat: z.number(),
        lng: z.number(),
        radius: z.number().default(2000),
        pageToken: z.string().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const reqProto = (ctx.req.headers["x-forwarded-proto"] as string) || (ctx.req.socket && (ctx.req.socket as any).encrypted ? "https" : "http");
        const reqHost = ctx.req.headers.host ?? "localhost:3000";
        const serverBase = `${reqProto}://${reqHost}`;

        const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
        if (input.pageToken) {
          // Page token encodes all prior search params; only key is needed alongside it
          url.searchParams.set("pagetoken", input.pageToken);
        } else {
          url.searchParams.set("location", `${input.lat},${input.lng}`);
          url.searchParams.set("radius", String(input.radius));
          url.searchParams.set("type", "restaurant");
        }
        url.searchParams.set("key", ENV.googlePlacesApiKey);

        type GPlace = {
          place_id: string;
          name: string;
          vicinity: string;
          geometry: { location: { lat: number; lng: number } };
          rating?: number;
          user_ratings_total?: number;
          price_level?: number;
          opening_hours?: { open_now: boolean };
          photos?: { photo_reference: string; height: number; width: number }[];
          types: string[];
        };
        type PlacesResponse = { results: GPlace[]; next_page_token?: string; status: string };

        // Page tokens need ~2s to activate; retry once on INVALID_REQUEST
        let data: PlacesResponse = { results: [], status: "UNKNOWN" };
        for (let attempt = 0; attempt < 2; attempt++) {
          const res = await fetch(url.toString());
          if (!res.ok) throw new Error("Google Places Nearby Search failed");
          data = await res.json() as PlacesResponse;
          if (data.status !== "INVALID_REQUEST") break;
          await new Promise((r) => setTimeout(r, 2000));
        }

        const restaurants = await Promise.all(data.results.map(async (place) => {
          const cuisines = place.types
            .map((t) => CUISINE_MAP[t])
            .filter((c): c is string => !!c);

          // Sort portrait/square photos first (food shots) before wide landscape (interiors)
          const sortedPhotos = [...(place.photos ?? [])].sort((a, b) => {
            const ratioA = a.width / (a.height || 1);
            const ratioB = b.width / (b.height || 1);
            return ratioA - ratioB;
          });
          const googlePhotos = sortedPhotos.map(
            (p) => `${serverBase}/api/places/photo?ref=${encodeURIComponent(p.photo_reference)}`
          );

          // If best available photo is still landscape (ratio > 1.1), search for a real food image
          const bestRatio = sortedPhotos[0] ? sortedPhotos[0].width / (sortedPhotos[0].height || 1) : 2;
          let photos = googlePhotos.length ? googlePhotos : [];
          if (bestRatio > 1.1) {
            const cached = foodImageCache.get(place.place_id);
            if (cached) {
              photos = [cached, ...photos];
            } else {
              const foodImage = await searchFoodImage(
                place.name,
                cuisines[0] ?? "food",
                ENV.serperApiKey,
                place.geometry.location.lat,
                place.geometry.location.lng
              );
              if (foodImage) {
                foodImageCache.set(place.place_id, foodImage);
                saveCache(foodImageCache);
                photos = [foodImage, ...photos];
              }
            }
          }
          if (!photos.length) photos = ["https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800"];
          const imageUrl = photos[0];

          return {
            id: place.place_id,
            name: place.name,
            cuisine: cuisines as string[],
            rating: place.rating ?? 4.0,
            reviewCount: place.user_ratings_total ?? 0,
            priceLevel: (Math.max(1, Math.min(4, place.price_level ?? 2))) as 1 | 2 | 3 | 4,
            distance: Math.round(haversineKm(input.lat, input.lng, place.geometry.location.lat, place.geometry.location.lng) * 10) / 10,
            imageUrl,
            photos,
            address: place.vicinity,
            isOpen: place.opening_hours?.open_now ?? true,
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
          };
        }));

        return { restaurants, nextPageToken: data.next_page_token ?? null };
      }),
  }),
});

export type AppRouter = typeof appRouter;
