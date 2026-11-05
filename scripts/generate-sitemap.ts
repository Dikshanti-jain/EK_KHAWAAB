import fs from "fs";
import { POEMS, getPoemSlug } from "../src/data/poems.ts";
import { LUGHAT, getWordSlug } from "../src/data/lughat.ts";

const today = "2026-11-05";

const coreUrls = [
  { loc: "https://ek-khawaab.vercel.app/", changefreq: "daily", priority: "1.0", image: { loc: "https://ek-khawaab.vercel.app/logo.png", title: "Ek Khawaab — Anonymous Poetry Sanctuary", caption: "Literary sanctuary for Hindi, Urdu and Hinglish shayari" } },
  { loc: "https://ek-khawaab.vercel.app/explore", changefreq: "daily", priority: "0.9" },
  { loc: "https://ek-khawaab.vercel.app/ai-poet", changefreq: "daily", priority: "0.9" },
  { loc: "https://ek-khawaab.vercel.app/card-studio", changefreq: "daily", priority: "0.9" },
  { loc: "https://ek-khawaab.vercel.app/secret-letters", changefreq: "daily", priority: "0.9" },
  { loc: "https://ek-khawaab.vercel.app/dictionary", changefreq: "daily", priority: "0.9" },
  { loc: "https://ek-khawaab.vercel.app/feed", changefreq: "daily", priority: "0.9" },
  { loc: "https://ek-khawaab.vercel.app/studio", changefreq: "daily", priority: "0.9" },
  { loc: "https://ek-khawaab.vercel.app/letters", changefreq: "daily", priority: "0.9" },
  { loc: "https://ek-khawaab.vercel.app/guidelines", changefreq: "monthly", priority: "0.5" },
  { loc: "https://ek-khawaab.vercel.app/privacy", changefreq: "monthly", priority: "0.5" },
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
  xml += `    <loc>https://ek-khawaab.vercel.app/topic/${topic}</loc>\n`;
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += `    <changefreq>daily</changefreq>\n`;
  xml += `    <priority>0.85</priority>\n`;
  xml += `  </url>\n`;
}

for (const poem of POEMS) {
  const slug = getPoemSlug(poem);
  xml += `  <url>\n`;
  xml += `    <loc>https://ek-khawaab.vercel.app/poetry/${slug}</loc>\n`;
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += `    <changefreq>weekly</changefreq>\n`;
  xml += `    <priority>0.8</priority>\n`;
  xml += `  </url>\n`;
}

for (const word of LUGHAT) {
  const slug = getWordSlug(word);
  xml += `  <url>\n`;
  xml += `    <loc>https://ek-khawaab.vercel.app/dictionary/${slug}</loc>\n`;
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += `    <changefreq>weekly</changefreq>\n`;
  xml += `    <priority>0.7</priority>\n`;
  xml += `  </url>\n`;
}

xml += `</urlset>\n`;

fs.writeFileSync("public/sitemap.xml", xml, "utf8");
console.log(`Successfully generated public/sitemap.xml with ${coreUrls.length + topicSlugs.length + POEMS.length + LUGHAT.length} URLs!`);
