import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { POEMS, getPoemSlug } from "../src/data/poems.ts";
import { LUGHAT, getWordSlug } from "../src/data/lughat.ts";
import { TOPICS } from "../src/data/topics.ts";

const SITE_URL = "https://ekkhwaab.in";
const DIST_DIR = path.resolve("dist");

// Ensure clean dist directory
if (fs.existsSync(DIST_DIR)) {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(DIST_DIR, { recursive: true });

// 1. Copy all static assets from .output/public into dist/
const outputPublicDir = path.resolve(".output/public");
if (fs.existsSync(outputPublicDir)) {
  fs.cpSync(outputPublicDir, DIST_DIR, { recursive: true });
  console.log("✓ Copied .output/public assets into dist/");
} else {
  console.warn("⚠ .output/public not found. Ensure `vite build` has completed first.");
}

// 2. Ensure public/.htaccess is copied to dist/.htaccess
const htaccessPath = path.resolve("public/.htaccess");
if (fs.existsSync(htaccessPath)) {
  fs.copyFileSync(htaccessPath, path.join(DIST_DIR, ".htaccess"));
  console.log("✓ Copied public/.htaccess to dist/.htaccess");
}

// 3. Ensure robots.txt and sitemap.xml are present in dist/
const robotsPath = path.resolve("public/robots.txt");
if (fs.existsSync(robotsPath)) {
  fs.copyFileSync(robotsPath, path.join(DIST_DIR, "robots.txt"));
}

const sitemapPath = path.resolve("public/sitemap.xml");
if (fs.existsSync(sitemapPath)) {
  fs.copyFileSync(sitemapPath, path.join(DIST_DIR, "sitemap.xml"));
}

// 4. Load Nitro server app for SSR static pre-rendering
console.log("\n--- Starting Static Pre-Rendering for Hostinger (https://ekkhwaab.in) ---");
const serverEntry = path.resolve(".output/server/index.mjs");

if (!fs.existsSync(serverEntry)) {
  console.error("❌ Nitro server entry (.output/server/index.mjs) not found. Run `vite build` first.");
  process.exit(1);
}

const { default: nitroApp } = await import(pathToFileURL(serverEntry).href);

// Helper to pre-render a route and write to dist/[route]/index.html
async function prerenderRoute(routePath) {
  try {
    const req = new Request(`http://localhost${routePath}`, {
      headers: {
        host: "ekkhwaab.in",
        "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      },
    });

    const res = await nitroApp.fetch(req, {
      ASSETS: {
        fetch: () => new Response("Not Found", { status: 404 }),
      },
    });

    if (!res.ok) {
      console.warn(`⚠ Route ${routePath} returned status ${res.status}`);
      return false;
    }

    let html = await res.text();

    // Ensure canonical domain is https://ekkhwaab.in and brand spelling is strictly Ek Khwaab
    html = html.replace(/https:\/\/ek-khawaab\.vercel\.app/g, SITE_URL);
    html = html.replace(/https:\/\/ekkhawaab\.in/g, SITE_URL);
    html = html.replace(/Ek Khawaab/g, "Ek Khwaab");
    html = html.replace(/Khawaab Khat/g, "Khwaab Khat");
    html = html.replace(/Shayar-e-Khawaab/g, "Shayar-e-Khwaab");

    const cleanPath = routePath.replace(/^\/+|\/+$/g, "");
    const targetFolder = cleanPath ? path.join(DIST_DIR, cleanPath) : DIST_DIR;
    fs.mkdirSync(targetFolder, { recursive: true });
    fs.writeFileSync(path.join(targetFolder, "index.html"), html, "utf8");

    return true;
  } catch (err) {
    console.error(`❌ Failed to pre-render ${routePath}:`, err.message);
    return false;
  }
}

// A. Core Static Pages
const corePages = [
  "/",
  "/explore",
  "/feed",
  "/ai-poet",
  "/card-studio",
  "/studio",
  "/secret-letters",
  "/letters",
  "/dictionary",
  "/guidelines",
  "/privacy",
];

for (const p of corePages) {
  await prerenderRoute(p);
}
console.log(`✓ Pre-rendered ${corePages.length} core application routes.`);

// B. Topic Category Pages
let topicCount = 0;
for (const topic of Object.values(TOPICS)) {
  const ok = await prerenderRoute(`/topic/${topic.slug}`);
  if (ok) topicCount++;
}
console.log(`✓ Pre-rendered ${topicCount} topic category routes.`);

// C. Dedicated Poem Pages
let poemCount = 0;
for (const poem of POEMS) {
  const slug = getPoemSlug(poem);
  const ok = await prerenderRoute(`/poetry/${slug}`);
  if (ok) poemCount++;
}
console.log(`✓ Pre-rendered ${poemCount} poem showcase routes.`);

// D. Dedicated Dictionary Pages
let wordCount = 0;
for (const word of LUGHAT) {
  const slug = getWordSlug(word);
  const ok = await prerenderRoute(`/dictionary/${slug}`);
  if (ok) wordCount++;
}
console.log(`✓ Pre-rendered ${wordCount} Lughat dictionary routes.`);

console.log("\n=======================================================");
console.log(`🎉 Hostinger public_html bundle successfully prepared in ${DIST_DIR}`);
console.log(`Total pre-rendered HTML files: ${corePages.length + topicCount + poemCount + wordCount}`);
console.log("=======================================================\n");
