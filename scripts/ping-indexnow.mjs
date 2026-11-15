#!/usr/bin/env node
/**
 * IndexNow publisher for ekkhwaab.in.
 *
 * Reads the canonical URLs from `dist/sitemap.xml` (falling back to
 * `public/sitemap.xml`), verifies that the IndexNow key file is live, and
 * submits the URL list to api.indexnow.org.
 *
 * Usage:
 *   npm run seo:ping                 # submit every sitemap URL
 *   npm run seo:ping -- --dry-run    # print what would be sent, no network
 *   npm run seo:ping -- --url=https://ekkhwaab.in/topic/love-shayari
 *   npm run seo:ping -- --only=/topic/
 *   npm run seo:ping -- --limit=50
 *
 * Environment:
 *   INDEXNOW_KEY      32-hex key (default: auto-detected from public/<key>.txt)
 *   INDEXNOW_ENDPOINT default https://api.indexnow.org/indexnow
 *   SITE_URL          default https://ekkhwaab.in
 *
 * The key file must remain at https://ekkhwaab.in/<key>.txt. It is copied to
 * dist/ by the normal build, and this script also copies it as a safety net.
 */
import fs from "node:fs";
import path from "node:path";

const SITE_URL = (process.env.SITE_URL || "https://ekkhwaab.in").replace(/\/+$/, "");
const HOST = new URL(SITE_URL).host;
const ENDPOINT = process.env.INDEXNOW_ENDPOINT || "https://api.indexnow.org/indexnow";
const MAX_URLS_PER_REQUEST = 10_000;
const KEY_PATTERN = /^[a-f0-9]{32}$/i;

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback = null) => {
  const prefix = `--${name}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
};

const dryRun = flag("dry-run");
const skipVerify = flag("skip-verify") || dryRun;
const only = value("only");
const limit = Number(value("limit", "0")) || 0;
const explicitUrls = args
  .filter((arg) => arg.startsWith("--url="))
  .map((arg) => arg.slice("--url=".length).trim())
  .filter(Boolean);

function fail(message) {
  console.error(`✖ ${message}`);
  process.exitCode = 1;
  throw new Error(message);
}

function findKey() {
  if (process.env.INDEXNOW_KEY && KEY_PATTERN.test(process.env.INDEXNOW_KEY)) {
    return process.env.INDEXNOW_KEY;
  }
  const publicDir = path.resolve("public");
  if (!fs.existsSync(publicDir)) return null;
  for (const entry of fs.readdirSync(publicDir)) {
    const match = entry.match(/^([a-f0-9]{32})\.txt$/i);
    if (!match) continue;
    const key = match[1];
    const body = fs.readFileSync(path.join(publicDir, entry), "utf8").trim();
    if (body === key) return key;
  }
  return null;
}

function readSitemapLocations() {
  const candidates = ["dist/sitemap.xml", "public/sitemap.xml"].map((file) =>
    path.resolve(file)
  );
  const file = candidates.find((candidate) => fs.existsSync(candidate));
  if (!file) fail("No sitemap found. Run `npm run build` or `npx tsx scripts/generate-sitemap.ts` first.");

  const xml = fs.readFileSync(file, "utf8");
  const locations = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)]
    .map((match) => match[1].trim())
    .map((loc) => loc.replace(/&amp;/g, "&"));

  if (locations.length === 0) fail(`Sitemap ${path.relative(process.cwd(), file)} has no <loc> entries.`);
  return { file, locations };
}

function normalise(url) {
  try {
    const parsed = new URL(url, SITE_URL);
    if (parsed.host !== HOST) return null;
    parsed.hash = "";
    return parsed.href;
  } catch {
    return null;
  }
}

function unique(list) {
  return [...new Set(list)];
}

async function verifyKeyLocation(key) {
  const keyUrl = `${SITE_URL}/${key}.txt`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(keyUrl, {
      method: "GET",
      headers: { "cache-control": "no-cache" },
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, reason: `HTTP ${response.status}` };
    const body = (await response.text()).trim();
    if (body !== key) return { ok: false, reason: "key file content mismatch" };
    return { ok: true, keyUrl };
  } catch (error) {
    return { ok: false, reason: error.name === "AbortError" ? "timeout" : error.message };
  } finally {
    clearTimeout(timer);
  }
}

async function submit(key, urlList) {
  const payload = {
    host: HOST,
    key,
    keyLocation: `${SITE_URL}/${key}.txt`,
    urlList,
  };

  const attempt = async (n) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timer);
    }
  };

  for (let n = 1; n <= 3; n += 1) {
    const response = await attempt(n);
    if (response.ok) return response;

    // 422 = key/host validation problem. Retrying cannot fix it.
    if (response.status === 422) {
      const body = await response.text().catch(() => "");
      fail(`IndexNow rejected the submission (422). ${body || "Check keyLocation and host."}`);
    }
    if (response.status === 429 || response.status >= 500) {
      const retryAfter = Number(response.headers.get("retry-after")) || n * 5;
      console.warn(`⚠ IndexNow returned ${response.status}; retrying in ${retryAfter}s (${n}/3)`);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      continue;
    }
    const body = await response.text().catch(() => "");
    fail(`IndexNow returned ${response.status}. ${body}`);
  }
  fail("IndexNow did not accept the submission after 3 attempts.");
}

async function main() {
  const key = findKey();
  if (!key) {
    fail(
      "No 32-character hex IndexNow key found. Create public/<32-hex>.txt containing the same key, or set INDEXNOW_KEY."
    );
  }

  const { file, locations } = readSitemapLocations();
  let urls = explicitUrls.length > 0 ? explicitUrls : locations;
  if (only) urls = urls.filter((url) => url.includes(only));
  urls = unique(urls.map(normalise).filter(Boolean));

  if (limit > 0) urls = urls.slice(0, limit);

  if (urls.length === 0) fail("No matching same-host URLs to submit.");

  console.log(`IndexNow host: ${HOST}`);
  console.log(`Key: ${key}`);
  console.log(`Source: ${path.relative(process.cwd(), file)} (${locations.length} loc entries)`);
  console.log(`Submitting ${urls.length} URL(s)${only ? ` matching "${only}"` : ""}.`);

  if (dryRun) {
    for (const url of urls.slice(0, 20)) console.log(`  · ${url}`);
    if (urls.length > 20) console.log(`  … and ${urls.length - 20} more`);
    console.log("Dry run: nothing was sent.");
    return;
  }

  // Ensure the key file also lands in dist/ when a build directory exists.
  const distDir = path.resolve("dist");
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, `${key}.txt`), key, "utf8");
  }

  if (!skipVerify) {
    const verified = await verifyKeyLocation(key);
    if (!verified.ok) {
      fail(
        `Key file ${SITE_URL}/${key}.txt is not live (${verified.reason}). Deploy public/${key}.txt before pinging.`
      );
    }
    console.log(`✓ Key verified at ${verified.keyUrl}`);
  }

  let submitted = 0;
  for (let i = 0; i < urls.length; i += MAX_URLS_PER_REQUEST) {
    const batch = urls.slice(i, i + MAX_URLS_PER_REQUEST);
    await submit(key, batch);
    submitted += batch.length;
    console.log(`✓ Submitted ${submitted}/${urls.length}`);
  }

  console.log(`✓ IndexNow accepted ${submitted} URL(s).`);
}

main().catch((error) => {
  if (process.exitCode !== 1) {
    console.error("✖ IndexNow ping failed:", error.message || error);
    process.exitCode = 1;
  }
});
