import Anthropic from "@anthropic-ai/sdk";
import { readFile, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FloorPlanError, MODEL, readFloorPlan, type ImageType } from "./floorPlanAi.ts";
import { findCodex, readFloorPlanWithCodex } from "./floorPlanCodex.ts";
import type { FloorPlanReading } from "./floorPlanSchema.ts";

/**
 * Room Atelier's server: reads floor plans (POST /api/floor-plan) and, in
 * production, serves the built app from dist/. In development Vite serves the
 * app and proxies /api here.
 *
 * Plans are read by the Codex CLI on this machine, signed in with ChatGPT (no
 * API key), or with FLOOR_PLAN_PROVIDER=claude by the Claude API, which needs
 * ANTHROPIC_API_KEY.
 * For working on the app without API calls, FLOOR_PLAN_MOCK names a JSON file
 * (a saved reading) to answer every request with.
 */

const PORT = Number(process.env.PORT) || 5181;
const MOCK = process.env.FLOOR_PLAN_MOCK;
const PROVIDER = process.env.FLOOR_PLAN_PROVIDER === "claude" ? "claude" : "codex";
const READER = MOCK ? `the saved reading ${MOCK}` : PROVIDER === "claude" ? MODEL : `Codex (${findCodex() ?? "not found"})`;
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
const MAX_BODY = 8 * 1024 * 1024;
const IMAGE_TYPES: ImageType[] = ["image/png", "image/jpeg", "image/webp"];
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".ico": "image/x-icon",
};

let client: Anthropic | null = null;
/** Built on first use, so the app still serves when no credentials are set. */
const anthropic = () => (client ??= new Anthropic());

function send(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new FloorPlanError("The image is too large (8 MB at most).", 413);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** POST { image: "data:image/png;base64,..." } → the plan's reading as JSON. */
async function floorPlan(req: http.IncomingMessage, res: http.ServerResponse) {
  try {
    let image: unknown;
    try {
      ({ image } = JSON.parse(await readBody(req)));
    } catch (e) {
      if (e instanceof FloorPlanError) throw e;
      throw new FloorPlanError("Send JSON: { image: <data URL> }.", 400);
    }
    const match = typeof image === "string" ? /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(image) : null;
    if (!match || !IMAGE_TYPES.includes(match[1] as ImageType)) throw new FloorPlanError("Send a PNG, JPEG or WebP image as a data URL.", 400);
    const started = Date.now();
    const reading = MOCK ? JSON.parse(await readFile(MOCK, "utf8")) as FloorPlanReading
      : PROVIDER === "claude" ? await readFloorPlan(anthropic(), match[2], match[1] as ImageType)
      : await readFloorPlanWithCodex(match[2], match[1] as ImageType);
    console.log(`floor plan read in ${((Date.now() - started) / 1000).toFixed(1)} s: ${reading.rooms.length} rooms`);
    send(res, 200, reading);
  } catch (error) {
    if (error instanceof FloorPlanError) {
      console.warn(`floor plan: ${error.status} ${error.message}`);
      send(res, error.status, { error: error.message, code: error.code });
    } else {
      console.error(error);
      send(res, 500, { error: "Unexpected server error." });
    }
  }
}

/** The built app; unknown paths get index.html so client routes still load. */
async function serveStatic(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = new URL(req.url ?? "/", "http://localhost");
  let file = path.join(DIST, decodeURIComponent(url.pathname));
  if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
  } catch {
    file = path.join(DIST, "index.html");
  }
  try {
    const body = await readFile(file);
    const ext = path.extname(file);
    res.writeHead(200, {
      "content-type": MIME[ext] ?? "application/octet-stream",
      "cache-control": url.pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not built yet: run `npm run build`.");
  }
}

http.createServer((req, res) => {
  const url = req.url ?? "/";
  if (url === "/api/health") return send(res, 200, { ok: true, reader: READER });
  if (url === "/api/floor-plan") {
    if (req.method !== "POST") return send(res, 405, { error: "Use POST." });
    return void floorPlan(req, res);
  }
  if (url.startsWith("/api/")) return send(res, 404, { error: "Not found." });
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, { error: "Use GET." });
  void serveStatic(req, res);
}).listen(PORT, () => {
  console.log(`Room Atelier server on http://localhost:${PORT} (floor plans read by ${READER})`);
});
