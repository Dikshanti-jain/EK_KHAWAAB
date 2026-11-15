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

// A. Core Static Pages. Canonical hubs plus the working aliases. The aliases
// keep a unique title/description and canonicalise to their primary hub.
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
  "/stages-of-love",
  "/directory",
  "/listen-together",
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

// E. Machine-readable assets: sitemap, RSS, llms.txt, llms-full.txt.
//    generate-sitemap.ts runs before vite build so the files are also copied
//    through .output/public; re-writing them here guarantees the dist bundle
//    is complete even if that step is skipped.
const SEO_LASTMOD = "2026-11-14";
const machineFiles = ["sitemap.xml", "rss.xml", "llms.txt", "llms-full.txt", "seo-manifest.json"];

for (const name of machineFiles) {
  const source = path.resolve("public", name);
  if (!fs.existsSync(source)) {
    console.error(`❌ Missing public/${name}. Run \`npx tsx scripts/generate-sitemap.ts\` first.`);
    process.exit(1);
  }
  let content = fs.readFileSync(source, "utf8");
  if (name === "sitemap.xml" || name === "rss.xml") {
    content = content.replace(/<lastmod>[^<]*<\/lastmod>/g, `<lastmod>${SEO_LASTMOD}</lastmod>`);
  }
  fs.writeFileSync(path.join(DIST_DIR, name), content, "utf8");
  console.log(`✓ Wrote dist/${name}`);
}

// F. Verification gate: every pre-rendered page must carry exactly one unique
//    title, description and canonical. Duplicate metadata is the fastest way
//    for Google to collapse 70 pages into one.
function collectHtmlFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectHtmlFiles(full, out);
    else if (entry.name === "index.html") out.push(full);
  }
  return out;
}

const htmlFiles = collectHtmlFiles(DIST_DIR);
const titles = new Map();
const descriptions = new Map();
const errors = [];

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const relative = path.relative(DIST_DIR, file).replace(/\\/g, "/");

  const titleMatches = [...html.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)];
  const descMatches = [
    ...html.matchAll(/<meta[^>]+name=["']description["'][^>]*>/gi),
  ];
  const canonicalMatches = [
    ...html.matchAll(/<link[^>]+rel=["']canonical["'][^>]*>/gi),
  ];

  if (titleMatches.length !== 1) {
    errors.push(`${relative}: expected 1 <title>, found ${titleMatches.length}`);
  }
  if (descMatches.length !== 1) {
    errors.push(`${relative}: expected 1 meta description, found ${descMatches.length}`);
  }
  if (canonicalMatches.length !== 1) {
    errors.push(`${relative}: expected 1 canonical, found ${canonicalMatches.length}`);
  }

  const title = (titleMatches[0]?.[1] || "").trim();
  const desc = (descMatches[0]?.[0] || "").trim();
  if (!title) errors.push(`${relative}: empty title`);
  if (!desc) errors.push(`${relative}: empty description`);

  if (title) {
    if (titles.has(title)) errors.push(`${relative}: duplicate title with ${titles.get(title)} — "${title}"`);
    else titles.set(title, relative);
  }
  if (desc) {
    if (descriptions.has(desc)) errors.push(`${relative}: duplicate description with ${descriptions.get(desc)}`);
    else descriptions.set(desc, relative);
  }
}

for (const name of ["sitemap.xml", "rss.xml", "llms.txt", "llms-full.txt", "seo-manifest.json", "robots.txt", "directory/index.html", "stages-of-love/index.html"]) {
  const target = path.join(DIST_DIR, name);
  if (!fs.existsSync(target) || fs.statSync(target).size === 0) {
    errors.push(`missing or empty dist/${name}`);
  }
}

// IndexNow key files are 32 hex characters + .txt and must remain reachable at
// https://ekkhwaab.in/<key>.txt for the lifetime of the submission.
const indexNowKeys = fs
  .readdirSync(path.resolve("public"))
  .filter((entry) => /^[a-f0-9]{32}\.txt$/i.test(entry));
if (indexNowKeys.length === 0) {
  errors.push("no IndexNow key file found in public/ (expected <32-hex>.txt)");
}
for (const keyFile of indexNowKeys) {
  if (!fs.existsSync(path.join(DIST_DIR, keyFile))) {
    errors.push(`missing dist/${keyFile} (IndexNow key)`);
  }
}

const sitemapXml = fs.readFileSync(path.join(DIST_DIR, "sitemap.xml"), "utf8");
const rssXml = fs.readFileSync(path.join(DIST_DIR, "rss.xml"), "utf8");
const sitemapCount = (sitemapXml.match(/<loc>/g) || []).length;
const rssCount = (rssXml.match(/<item>/g) || []).length;

console.log("\n=======================================================");
if (errors.length > 0) {
  console.error("❌ SEO VERIFICATION FAILED");
  for (const error of errors) console.error(`   - ${error}`);
  console.error("=======================================================\n");
  process.exit(1);
}

console.log("✓ SEO verification passed");
console.log(`   HTML files: ${htmlFiles.length}`);
console.log(`   Unique titles: ${titles.size}`);
console.log(`   Unique descriptions: ${descriptions.size}`);
console.log(`   Sitemap URLs: ${sitemapCount}`);
console.log(`   RSS items: ${rssCount}`);
console.log(`🎉 Production bundle successfully prepared in ${DIST_DIR}`);
console.log("=======================================================\n");
process.exit(0);
