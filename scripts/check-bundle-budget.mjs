// Bundle budget gate. Runs after `vite build` so the next feature cannot
// silently re-inflate the entry chunk to its old 216.8 kB gzip.
//
// Limits are gzip, not raw: gzip is what the user downloads.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const DIRS = [".output/public/assets", "dist/assets"];
const ENTRY_LIMIT = 95 * 1024;
const CHUNK_LIMIT = 120 * 1024;

const dir = DIRS.find((d) => existsSync(d));
if (!dir) {
  console.error(`Bundle budget: no assets directory found (looked in ${DIRS.join(", ")}).`);
  process.exit(1);
}

const files = readdirSync(dir).filter((f) => f.endsWith(".js"));
if (files.length === 0) {
  console.error(`Bundle budget: no .js files in ${dir}.`);
  process.exit(1);
}

let failed = false;
let totalRaw = 0;
let totalGz = 0;

for (const f of files.sort()) {
  const raw = readFileSync(join(dir, f));
  const gz = gzipSync(raw, { level: 9 }).length;
  totalRaw += raw.length;
  totalGz += gz;
  const isEntry = /^index-/.test(f);
  const limit = isEntry ? ENTRY_LIMIT : CHUNK_LIMIT;
  const status = gz <= limit ? "ok" : "FAIL";
  if (gz > limit) failed = true;
  console.log(
    `${status.padEnd(4)} ${f.padEnd(42)} ${(raw.length / 1024).toFixed(1)} kB raw  ${(gz / 1024).toFixed(1)} kB gz  (limit ${(limit / 1024).toFixed(0)})`
  );
}

console.log(
  `\n${files.length} JS files · ${(totalRaw / 1024).toFixed(1)} kB raw · ${(totalGz / 1024).toFixed(1)} kB gz`
);

if (failed) {
  console.error("\nBundle budget exceeded. Split the chunk or remove the import.");
  process.exit(1);
}
