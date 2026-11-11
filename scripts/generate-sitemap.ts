import fs from "fs";
import { POEMS, getPoemSlug } from "../src/data/poems.ts";
import { LUGHAT, getWordSlug } from "../src/data/lughat.ts";

const SITE_URL = "https://ekkhwaab.in";
const today = new Date().toISOString().split("T")[0];

const coreUrls = [
  { loc: `${SITE_URL}/`, changefreq: "daily", priority: "1.0", image: { loc: `${SITE_URL}/logo.png`, title: "Ek Khwaab — Anonymous Poetry Sanctuary", caption: "Literary sanctuary for Hindi, Urdu and Hinglish shayari" } },
  { loc: `${SITE_URL}/explore`, changefreq: "daily", priority: "0.9" },
  { loc: `${SITE_URL}/ai-poet`, changefreq: "daily", priority: "0.9" },
  { loc: `${SITE_URL}/card-studio`, changefreq: "daily", priority: "0.9" },
  { loc: `${SITE_URL}/secret-letters`, changefreq: "daily", priority: "0.9" },
  { loc: `${SITE_URL}/dictionary`, changefreq: "daily", priority: "0.9" },
  { loc: `${SITE_URL}/feed`, changefreq: "daily", priority: "0.9" },
  { loc: `${SITE_URL}/studio`, changefreq: "daily", priority: "0.9" },
  { loc: `${SITE_URL}/letters`, changefreq: "daily", priority: "0.9" },
  { loc: `${SITE_URL}/guidelines`, changefreq: "monthly", priority: "0.5" },
  { loc: `${SITE_URL}/privacy`, changefreq: "monthly", priority: "0.5" },
];

const topicSlugs = [
  "heartbreak-shayari",
  "two-line-shayari",
  "loneliness-shayari",
  "love-shayari",
];

let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

for (const u of coreUrls) {
  xml += `  <url>\n`;
  xml += `    <loc>${u.loc}</loc>\n`;
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += `    <changefreq>${u.changefreq}</changefreq>\n`;
  xml += `    <priority>${u.priority}</priority>\n`;
  if (u.image) {
    xml += `    <image:image>\n`;
    xml += `      <image:loc>${u.image.loc}</image:loc>\n`;
    xml += `      <image:title>${u.image.title}</image:title>\n`;
    xml += `      <image:caption>${u.image.caption}</image:caption>\n`;
    xml += `    </image:image>\n`;
  }
  xml += `  </url>\n`;
}

for (const topic of topicSlugs) {
  xml += `  <url>\n`;
  xml += `    <loc>${SITE_URL}/topic/${topic}</loc>\n`;
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += `    <changefreq>daily</changefreq>\n`;
  xml += `    <priority>0.85</priority>\n`;
  xml += `  </url>\n`;
}

for (const poem of POEMS) {
  const slug = getPoemSlug(poem);
  xml += `  <url>\n`;
  xml += `    <loc>${SITE_URL}/poetry/${slug}</loc>\n`;
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += `    <changefreq>weekly</changefreq>\n`;
  xml += `    <priority>0.8</priority>\n`;
  xml += `  </url>\n`;
}

for (const word of LUGHAT) {
  const slug = getWordSlug(word);
  xml += `  <url>\n`;
  xml += `    <loc>${SITE_URL}/dictionary/${slug}</loc>\n`;
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += `    <changefreq>weekly</changefreq>\n`;
  xml += `    <priority>0.7</priority>\n`;
  xml += `  </url>\n`;
}

xml += `</urlset>\n`;

fs.writeFileSync("public/sitemap.xml", xml, "utf8");
console.log(`Successfully generated public/sitemap.xml with ${coreUrls.length + topicSlugs.length + POEMS.length + LUGHAT.length} URLs!`);
