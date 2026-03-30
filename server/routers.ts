import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { z } from "zod";

const CUISINE_MAP: Record<string, string> = {
  italian_restaurant: "Italian",
  japanese_restaurant: "Japanese",
  chinese_restaurant: "Chinese",
  mexican_restaurant: "Mexican",
  american_restaurant: "American",
  thai_restaurant: "Thai",
  indian_restaurant: "Indian",
  french_restaurant: "French",
  mediterranean_restaurant: "Mediterranean",
  korean_restaurant: "Korean",
  vietnamese_restaurant: "Vietnamese",
  greek_restaurant: "Greek",
  spanish_restaurant: "Spanish",
  middle_eastern_restaurant: "Middle Eastern",
  seafood_restaurant: "Seafood",
  steak_house: "Steakhouse",
  pizza_restaurant: "Pizza",
  sushi_restaurant: "Sushi",
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
        url.searchParams.set("types", "(cities)");
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

    nearbyRestaurants: publicProcedure
      .input(z.object({ lat: z.number(), lng: z.number(), radius: z.number().default(10000) }))
      .query(async ({ input }) => {
        const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
        url.searchParams.set("location", `${input.lat},${input.lng}`);
        url.searchParams.set("radius", String(input.radius));
        url.searchParams.set("type", "restaurant");
        url.searchParams.set("key", ENV.googlePlacesApiKey);

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error("Google Places Nearby Search failed");

        type GPlace = {
          place_id: string;
          name: string;
          vicinity: string;
          geometry: { location: { lat: number; lng: number } };
          rating?: number;
          user_ratings_total?: number;
          price_level?: number;
          opening_hours?: { open_now: boolean };
          photos?: { photo_reference: string }[];
          types: string[];
        };

        const data = await res.json() as { results: GPlace[] };

        return data.results.map((place) => {
          const cuisines = place.types
            .map((t) => CUISINE_MAP[t])
            .filter((c): c is string => !!c);

          const photoRef = place.photos?.[0]?.photo_reference;
          const imageUrl = photoRef
            ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${ENV.googlePlacesApiKey}`
            : "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800";

          return {
            id: place.place_id,
            name: place.name,
            cuisine: (cuisines.length > 0 ? cuisines : ["American"]) as string[],
            rating: place.rating ?? 4.0,
            reviewCount: place.user_ratings_total ?? 0,
            priceLevel: (Math.max(1, Math.min(4, place.price_level ?? 2))) as 1 | 2 | 3 | 4,
            distance: Math.round(haversineKm(input.lat, input.lng, place.geometry.location.lat, place.geometry.location.lng) * 10) / 10,
            imageUrl,
            address: place.vicinity,
            isOpen: place.opening_hours?.open_now ?? true,
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
          };
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
