import { readFile } from "node:fs/promises"
import path from "node:path"

import { requireCapability } from "@/app/_lib/auth/guard"
import { isLocalWordBloomHost } from "@/app/_lib/wordbloom-local"

/** @spec L2-UI-71 */
const PUBLIC_FILES = new Set([
  "app.js",
  "assets/football/coach-clean.png",
  "assets/football/coach.png",
  "assets/football/photos/alvarez.jpg",
  "assets/football/photos/bruno.jpg",
  "assets/football/photos/de-bruyne.jpg",
  "assets/football/photos/enzo.jpg",
  "assets/football/photos/lautaro.jpg",
  "assets/football/photos/lewandowski.jpg",
  "assets/football/photos/mac-allister.jpg",
  "assets/football/photos/modric.jpg",
  "assets/football/photos/musiala.jpg",
  "assets/football/photos/nico.jpg",
  "assets/football/photos/odegaard.jpg",
  "assets/football/photos/rice.jpg",
  "assets/football/photos/son.jpg",
  "assets/football/photos/valverde.jpg",
  "assets/football/photos/vitinha.jpg",
  "assets/football/photos/wirtz.jpg",
  "assets/football/players-1.png",
  "assets/football/players-2.png",
  "assets/fox.png",
  "core.js",
  "football.js",
  "index.html",
  "photo-credits.html",
  "photo-credits.json",
  "portraits.js",
  "seed.js",
  "storage.js",
  "styles.css",
])

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
}

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function serve(
  request: Request,
  asset: string[] | undefined,
  head = false
) {
  if (!isLocalWordBloomHost(request.headers.get("host"))) {
    await requireCapability("dashboard")
  }

  const relativePath = asset?.length ? asset.join("/") : "index.html"
  if (!PUBLIC_FILES.has(relativePath)) {
    return new Response("Not found", { status: 404 })
  }

  // The web workspace and standalone server both run from apps/web.
  const root = path.resolve(process.cwd(), "../../apps/wordbloom")

  const filePath = path.resolve(root, relativePath)
  if (!filePath.startsWith(root + path.sep)) {
    return new Response("Not found", { status: 404 })
  }

  try {
    const body = await readFile(/* turbopackIgnore: true */ filePath)
    return new Response(head ? null : body, {
      headers: {
        "Content-Type":
          CONTENT_TYPES[path.extname(filePath)] ?? "application/octet-stream",
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
    })
  } catch {
    return new Response("Not found", { status: 404 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ asset?: string[] }> }
) {
  const { asset } = await params
  return serve(request, asset)
}

export async function HEAD(
  request: Request,
  { params }: { params: Promise<{ asset?: string[] }> }
) {
  const { asset } = await params
  return serve(request, asset, true)
}
