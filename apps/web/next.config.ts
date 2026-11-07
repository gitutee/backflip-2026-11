import { readFileSync } from "node:fs"
import path from "node:path"
import type { NextConfig } from "next"

/**
 * Deployed version, read from the monorepo root `package.json` at build time
 * and inlined as `NEXT_PUBLIC_APP_VERSION`. Inlining (not a runtime read) is
 * deliberate: the standalone bundle is what ships, and the build-locally deploy
 * copies no repo source to the droplet, so there is no package.json to read.
 */
const { version: APP_VERSION } = JSON.parse(
  readFileSync(path.resolve(import.meta.dirname, "../../package.json"), "utf8")
) as { version: string }

/**
 * Baseline security response headers applied to every route. Deliberately
 * conservative: `frame-ancestors`/`base-uri`/`object-src` don't affect how
 * same-origin scripts/styles load, so they add clickjacking + injection
 * defense without a nonce pipeline. A full `script-src`/`style-src` CSP needs
 * per-request nonces (Next injects inline hydration script/style) and is left
 * as a follow-up. HSTS is prod-only so it never pins `localhost` to https.
 */
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
  },
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]
    : []),
]

/**
 * OAuth discovery documents live at `/.well-known/*`, which the App Router
 * can't express as a folder (a leading dot is not a valid route segment), so
 * they are rewritten onto ordinary API routes. The `/:path*` variants cover the
 * RFC 9728 path-suffixed form (`/.well-known/oauth-protected-resource/api/mcp`)
 * and the equivalent issuer-path form for the authorization server — clients
 * probe both spellings.
 *
 * @spec L2-MCP-10, L2-MCP-11
 */
const WELL_KNOWN_REWRITES = [
  {
    source: "/.well-known/oauth-authorization-server",
    destination: "/api/oauth/authorization-server-metadata",
  },
  {
    source: "/.well-known/oauth-authorization-server/:path*",
    destination: "/api/oauth/authorization-server-metadata",
  },
  {
    source: "/.well-known/oauth-protected-resource",
    destination: "/api/oauth/protected-resource-metadata",
  },
  {
    source: "/.well-known/oauth-protected-resource/:path*",
    destination: "/api/oauth/protected-resource-metadata",
  },
]

/**
 * `/backflip/settings` used to be the Integrations page itself; it is now a
 * section prefix (`/settings/integrations`, `/settings/mcp-capabilities`).
 * Keep the old address answering so bookmarks and deep links
 * (`?integration=…`, `L2-UI-59`) still land — the query string survives a
 * config redirect untouched.
 *
 * @spec L2-UI-64
 */
const SETTINGS_REDIRECTS = [
  {
    source: "/backflip/settings",
    destination: "/backflip/settings/integrations",
    permanent: false,
  },
]

/** @spec L2-UI-10, L2-UI-19, L2-UI-72, L2-DEVOPS-16, L2-DEVOPS-21, L2-MCP-10, L2-MCP-11 */
const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: APP_VERSION,
  },
  async headers() {
    const wordBloomNoStore = [
      {
        key: "Cache-Control",
        value: "private, no-store, max-age=0, must-revalidate",
      },
    ]
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      { source: "/wordbloom", headers: wordBloomNoStore },
      { source: "/backflip/wordbloom", headers: wordBloomNoStore },
      { source: "/api/wordbloom/:path*", headers: wordBloomNoStore },
      ...(process.env.NODE_ENV === "development"
        ? [
            {
              source: "/_next/static/chunks/:path*",
              headers: wordBloomNoStore,
            },
          ]
        : []),
    ]
  },
  async rewrites() {
    return WELL_KNOWN_REWRITES
  },
  async redirects() {
    return SETTINGS_REDIRECTS
  },
  // Self-contained server bundle (.next/standalone) — run with `node server.js`,
  // not `next start`. Prod runtime: pm2 on the droplet, node in Docker locally.
  output: "standalone",
  outputFileTracingRoot: path.resolve(import.meta.dirname, "../.."),
  outputFileTracingExcludes: {
    "/api/wordbloom/**": ["../../apps/wordbloom/**/*"],
  },
  outputFileTracingIncludes: {
    "/api/wordbloom/**": [
      "../../apps/wordbloom/app.js",
      "../../apps/wordbloom/assets/football/coach-clean.png",
      "../../apps/wordbloom/assets/football/coach.png",
      "../../apps/wordbloom/assets/football/photos/alvarez.jpg",
      "../../apps/wordbloom/assets/football/photos/bruno.jpg",
      "../../apps/wordbloom/assets/football/photos/de-bruyne.jpg",
      "../../apps/wordbloom/assets/football/photos/enzo.jpg",
      "../../apps/wordbloom/assets/football/photos/lautaro.jpg",
      "../../apps/wordbloom/assets/football/photos/lewandowski.jpg",
      "../../apps/wordbloom/assets/football/photos/mac-allister.jpg",
      "../../apps/wordbloom/assets/football/photos/modric.jpg",
      "../../apps/wordbloom/assets/football/photos/musiala.jpg",
      "../../apps/wordbloom/assets/football/photos/nico.jpg",
      "../../apps/wordbloom/assets/football/photos/odegaard.jpg",
      "../../apps/wordbloom/assets/football/photos/rice.jpg",
      "../../apps/wordbloom/assets/football/photos/son.jpg",
      "../../apps/wordbloom/assets/football/photos/valverde.jpg",
      "../../apps/wordbloom/assets/football/photos/vitinha.jpg",
      "../../apps/wordbloom/assets/football/photos/wirtz.jpg",
      "../../apps/wordbloom/assets/football/players-1.png",
      "../../apps/wordbloom/assets/football/players-2.png",
      "../../apps/wordbloom/assets/fox.png",
      "../../apps/wordbloom/core.js",
      "../../apps/wordbloom/football.js",
      "../../apps/wordbloom/index.html",
      "../../apps/wordbloom/photo-credits.html",
      "../../apps/wordbloom/photo-credits.json",
      "../../apps/wordbloom/portraits.js",
      "../../apps/wordbloom/seed.js",
      "../../apps/wordbloom/storage.js",
      "../../apps/wordbloom/styles.css",
    ],
  },
  // The e2e suite boots its own dev server; it sets NEXT_DIST_DIR so it never
  // shares `.next` with a dev server already running on 3070.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  transpilePackages: ["@workspace/ui"],
  devIndicators: {
    position: "bottom-right",
  },
  turbopack: {
    root: path.resolve(import.meta.dirname, "../.."),
  },
  experimental: {
    // Persistent Turbopack cache in .next/cache — the droplet keeps .next
    // between deploys (rsync-protected), so warm rebuilds skip most compilation.
    turbopackFileSystemCacheForDev: true,
    turbopackFileSystemCacheForBuild: true,
  },
  typescript: {
    // Droplet builds run on 1 vCPU; the type check adds ~60s there and the same
    // code is typechecked in dev/CI. Deploy scripts set NEXT_SKIP_TYPECHECK=1;
    // local/CI builds still check.
    ignoreBuildErrors: process.env.NEXT_SKIP_TYPECHECK === "1",
  },
}

export default nextConfig
