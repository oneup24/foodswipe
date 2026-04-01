import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";

const PHOTO_CACHE_DIR = path.resolve(process.cwd(), ".cache/photos");

function getCachedPhoto(ref: string): { buffer: Buffer; contentType: string } | null {
  try {
    const hash = crypto.createHash("md5").update(ref).digest("hex");
    const binPath = path.join(PHOTO_CACHE_DIR, `${hash}.bin`);
    const ctPath = path.join(PHOTO_CACHE_DIR, `${hash}.ct`);
    if (fs.existsSync(binPath)) {
      return {
        buffer: fs.readFileSync(binPath),
        contentType: fs.existsSync(ctPath) ? fs.readFileSync(ctPath, "utf-8") : "image/jpeg",
      };
    }
  } catch {}
  return null;
}

function cachePhoto(ref: string, buffer: Buffer, contentType: string): void {
  try {
    fs.mkdirSync(PHOTO_CACHE_DIR, { recursive: true });
    const hash = crypto.createHash("md5").update(ref).digest("hex");
    fs.writeFileSync(path.join(PHOTO_CACHE_DIR, `${hash}.bin`), buffer);
    fs.writeFileSync(path.join(PHOTO_CACHE_DIR, `${hash}.ct`), contentType);
  } catch {}
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  // Public privacy policy page (required URL for App Store / Play Store / AdMob)
  app.get("/privacy", (_req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FoodSwipe – Privacy Policy</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.7; }
    h1 { font-size: 28px; } h2 { font-size: 18px; margin-top: 32px; }
    p, li { font-size: 15px; color: #444; } ul { padding-left: 20px; }
    .updated { color: #888; font-size: 13px; }
  </style>
</head>
<body>
  <h1>FoodSwipe – Privacy Policy</h1>
  <p class="updated">Last updated: March 2026</p>

  <h2>Overview</h2>
  <p>FoodSwipe helps you discover nearby restaurants through a swipe-based interface. This policy explains what data we collect, how we use it, and your rights.</p>

  <h2>Data We Collect</h2>
  <p><strong>Location</strong> — We request your device location to find restaurants near you. Location is used only within the app and is never stored on our servers.</p>
  <p><strong>Liked Restaurants</strong> — Your liked restaurants are saved locally on your device. This data never leaves your device.</p>
  <p><strong>Usage Data</strong> — Google AdMob may collect device identifiers and usage data to serve ads.</p>

  <h2>Third-Party Services</h2>
  <ul>
    <li><strong>Google Places API</strong> — restaurant data, photos, hours, reviews.</li>
    <li><strong>Google AdMob</strong> — advertising. May use device identifiers for ad personalisation.</li>
    <li><strong>Serper.dev</strong> — food photo search. Only restaurant name and cuisine are sent; no personal data is shared.</li>
  </ul>

  <h2>Data Storage</h2>
  <p>We do not operate user accounts. No personal information is collected or stored on our servers. Liked restaurants and preferences are stored locally on your device only. Uninstalling the app removes all locally stored data.</p>

  <h2>Advertising</h2>
  <p>FoodSwipe displays ads powered by Google AdMob. To opt out of personalised ads:</p>
  <ul>
    <li>iOS: Settings → Privacy → Apple Advertising → turn off Personalised Ads</li>
    <li>Android: Settings → Google → Ads → Opt out of Ads Personalisation</li>
  </ul>

  <h2>Children's Privacy</h2>
  <p>FoodSwipe is not directed at children under 13. We do not knowingly collect personal information from children under 13.</p>

  <h2>Your Rights</h2>
  <p>Since we do not collect personal data on our servers, there is no data to access, correct, or delete. All locally stored data can be removed by uninstalling the app.</p>

  <h2>Changes to This Policy</h2>
  <p>We may update this policy from time to time. Changes will be reflected by updating the "Last updated" date above.</p>

  <h2>Contact Us</h2>
  <p>Questions? Email us at <a href="mailto:support@foodswipe.app">support@foodswipe.app</a></p>
</body>
</html>`);
  });

  // Proxy Google Places photos to avoid exposing the API key to clients
  app.get("/api/places/photo", async (req, res) => {
    const ref = req.query.ref as string;
    if (!ref) {
      res.status(400).json({ error: "Missing ref" });
      return;
    }

    // Serve from disk cache if available
    const cached = getCachedPhoto(ref);
    if (cached) {
      res.setHeader("Content-Type", cached.contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(cached.buffer);
      return;
    }

    // New Places API v1: ref looks like "places/ChIJ.../photos/AUc..."
    // Old Places API:    ref is a base64-like photo_reference string
    const apiKey = process.env.GOOGLE_PLACES_API_KEY ?? "";
    const photoUrl = ref.startsWith("places/")
      ? `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=800&key=${apiKey}`
      : `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${encodeURIComponent(ref)}&key=${apiKey}`;
    const url = new URL(photoUrl);
    try {
      const upstream = await fetch(url.toString());
      res.status(upstream.status);
      const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      const buffer = Buffer.from(await upstream.arrayBuffer());
      cachePhoto(ref, buffer, contentType);
      res.send(buffer);
    } catch {
      res.status(502).json({ error: "Failed to fetch photo" });
    }
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
