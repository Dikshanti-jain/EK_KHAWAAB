import fs from "fs";
import path from "path";
import { POEMS, getPoemSlug } from "../src/data/poems.ts";
import { LUGHAT, getWordSlug } from "../src/data/lughat.ts";
import { TOPICS } from "../src/data/topics.ts";

const BASE_URL = "https://ek-khawaab.vercel.app";
const LAST_MOD = "2026-11-01";

// Target directories to populate
const outputDirs = [
  path.resolve("dist"),
  path.resolve(".vercel/output/static"),
  path.resolve(".output/public"),
  path.resolve("public"),
];

// Ensure directories exist
for (const dir of outputDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 1. Read base index.html template
const templatePath = fs.existsSync("dist/index.html")
  ? "dist/index.html"
  : fs.existsSync(".vercel/output/static/index.html")
  ? ".vercel/output/static/index.html"
  : fs.existsSync("index.html")
  ? "index.html"
  : "public/index.html";

const baseHtml = fs.readFileSync(templatePath, "utf8");

// Helper to write static route index.html
function writeRouteHtml(routePath, { title, description, canonical, semanticHtml, jsonLd }) {
  let html = baseHtml;

  // Title
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);

  // Meta description
  html = html.replace(
    /<meta\s+name="description"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta name="description" content="${description}" />`
  );

  // Canonical
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[\s\S]*?"\s*\/?>/,
    `<link rel="canonical" href="${canonical}" />`
  );

  // OpenGraph & Twitter
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta property="og:title" content="${title}" />`
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta property="og:description" content="${description}" />`
  );
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta property="og:url" content="${canonical}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta name="twitter:title" content="${title}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta name="twitter:description" content="${description}" />`
  );

  // Inject additional route JSON-LD if provided
  if (jsonLd) {
    const jsonLdTag = `\n    <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n    </script>`;
    html = html.replace("</head>", `${jsonLdTag}\n  </head>`);
  }

  // Inject pre-rendered semantic HTML inside <div id="root">
  if (semanticHtml) {
    html = html.replace(
      /<div id="root">[\s\S]*?<\/div>\s*<noscript>/,
      `<div id="root">\n${semanticHtml}\n    </div>\n    <noscript>`
    );
  }

  // Write to all existing target output directories
  const cleanSubPath = routePath.replace(/^\/+|\/+$/g, "");
  for (const baseDir of outputDirs) {
    const targetFolder = cleanSubPath ? path.join(baseDir, cleanSubPath) : baseDir;
    fs.mkdirSync(targetFolder, { recursive: true });
    fs.writeFileSync(path.join(targetFolder, "index.html"), html, "utf8");
  }
}

console.log("--- Starting Static HTML Pre-Rendering ---");

const sitemapUrls = [];

function registerSitemapUrl(loc, priority, changefreq = "weekly") {
  sitemapUrls.push({ loc, priority, changefreq });
}

// ----------------------------------------------------
// A. Core Static Pages
// ----------------------------------------------------
const CORE_PAGES = [
  {
    path: "/",
    title: "Ek Khawaab – Hindi, Urdu & Hinglish Shayari, Ghazals & Poetry",
    description: "Read and share original Hindi, Urdu and Hinglish shayari, two-line couplets, ghazals and nazms anonymously. Explore our Urdu poetry dictionary, AI shayari writer and card studio.",
    priority: "1.0",
    changefreq: "daily",
  },
  {
    path: "/feed",
    title: "Explore Hindi, Urdu & Hinglish Shayari, Ghazals & Poems | Ek Khawaab",
    description: "Browse trending two-line shayari, heartbreak poetry, late-night tanhai couplets, and unspoken love ghazals in Hinglish, Devanagari Hindi, and Nastaliq Urdu.",
    priority: "0.9",
    changefreq: "daily",
  },
  {
    path: "/explore",
    title: "Explore Hindi, Urdu & Hinglish Shayari, Ghazals & Poems | Ek Khawaab",
    description: "Browse trending two-line shayari, heartbreak poetry, late-night tanhai couplets, and unspoken love ghazals in Hinglish, Devanagari Hindi, and Nastaliq Urdu.",
    priority: "0.9",
    changefreq: "daily",
  },
  {
    path: "/ai-poet",
    title: "AI Shayari Writer in Hindi, Urdu & Hinglish | Ek Khawaab",
    description: "Turn your own words and feelings into meaningful Hindi, Urdu, and Hinglish shayari, two-line couplets, and ghazals using our literary AI co-writer.",
    priority: "0.9",
    changefreq: "daily",
    editorial: `
      <header><nav><a href="/">Home</a> | <a href="/feed">Feed</a> | <a href="/card-studio">Studio</a></nav></header>
      <main>
        <h1>AI Shayari Writer in Hindi, Urdu &amp; Hinglish</h1>
        <p>Turn your own words and feelings into meaningful Hindi, Urdu, and Hinglish shayari using our literary AI co-writer.</p>
        <section>
          <h2>How to Write Meaningful Hindi, Urdu &amp; Hinglish Shayari</h2>
          <article>
            <h3>Sher vs. Ghazal vs. Nazm</h3>
            <p>A Sher (couplet) consists of two balanced lines: the Misra-e-Ula (opening premise) and the Misra-e-Sani (emotional punchline). A Ghazal strings multiple autonomous couplets bound by a shared rhyme (Kaafiya) and refrain (Radif). A Nazm follows a single continuous theme from beginning to end.</p>
          </article>
          <article>
            <h3>How Word-Seeded Poetry Works</h3>
            <p>Instead of generic prompts, Ek Khawaab extracts the emotional gravity of your personal seed words (e.g., Chai, Baarish, Khidki, December). The AI analyzes their metaphorical resonance, aligns them into classical meter, and renders authentic couplets across Roman Hinglish, Devanagari Hindi, and Nastaliq Urdu.</p>
          </article>
          <article>
            <h3>Poetic Meter (Beher) &amp; Styles</h3>
            <p>Meter (Beher) dictates the rhythm and syllable weight of each line. Whether composing in the melancholic tone of Jaun Elia, the delicate imagery of Gulzar, or the philosophical grief of Mirza Ghalib, understanding rhythm ensures your verse lingers in memory.</p>
          </article>
        </section>
      </main>
    `,
  },
  {
    path: "/card-studio",
    title: "Poetry & Shayari Card Maker – Download HD 9:16 & 1:1 Cards | Ek Khawaab",
    description: "Create and download high-resolution Hindi, Urdu, and Hinglish shayari quote cards for Instagram Stories, WhatsApp Status, and square posts.",
    priority: "0.9",
    changefreq: "daily",
    editorial: `
      <header><nav><a href="/">Home</a> | <a href="/feed">Feed</a> | <a href="/ai-poet">AI Poet</a></nav></header>
      <main>
        <h1>Poetry &amp; Shayari Card Maker – Download HD 9:16 &amp; 1:1 Cards</h1>
        <p>Create and download high-resolution Hindi, Urdu, and Hinglish shayari quote cards for Instagram Stories, WhatsApp Status, and square posts.</p>
        <section>
          <h2>Designing Aesthetic Poetry Cards for Instagram Stories &amp; Posts</h2>
          <article>
            <h3>Choosing the Right Aspect Ratio</h3>
            <p>9:16 Story (1080x1920) is calibrated for full-screen Instagram Stories, WhatsApp Status, and vertical mobile reading. 1:1 Square (1080x1080) is ideal for Instagram feed carousels, and 4:5 Portrait commands maximum vertical feed real estate.</p>
          </article>
          <article>
            <h3>Nastaliq &amp; Serif Typography</h3>
            <p>When rendering Urdu Nastaliq (with dir="rtl"), the canvas applies right-to-left layout and generous line-height. Hinglish pairs with Playfair Display, and Hindi renders in authentic Noto Serif Devanagari.</p>
          </article>
          <article>
            <h3>Contrast &amp; Anonymous Pen Name</h3>
            <p>High-contrast palettes (Royal Ink Blue, Velvet Crimson, Soft Ivory, Pure White) ensure readability on OLED and Retina displays. The watermark binds your public pen name and unique #EK-ID, keeping your identity protected.</p>
          </article>
        </section>
      </main>
    `,
  },
  {
    path: "/studio",
    title: "Poetry & Shayari Card Maker – Download HD 9:16 & 1:1 Cards | Ek Khawaab",
    description: "Create and download high-resolution Hindi, Urdu, and Hinglish shayari quote cards for Instagram Stories, WhatsApp Status, and square posts.",
    priority: "0.9",
    changefreq: "daily",
  },
  {
    path: "/secret-letters",
    title: "Khawaab Khat – Send Anonymous Wax-Sealed Poetry Letters | Ek Khawaab",
    description: "Dedicate shayari secretly with interactive digital wax-sealed letters and clue-based guessing riddles.",
    priority: "0.9",
    changefreq: "daily",
  },
  {
    path: "/letters",
    title: "Khawaab Khat – Send Anonymous Wax-Sealed Poetry Letters | Ek Khawaab",
    description: "Dedicate shayari secretly with interactive digital wax-sealed letters and clue-based guessing riddles.",
    priority: "0.9",
    changefreq: "daily",
  },
  {
    path: "/dictionary",
    title: "Urdu & Hindi Poetry Dictionary (Lughat) – Meanings & Examples | Ek Khawaab",
    description: "Learn the meanings, pronunciation, and shayari examples of deep Urdu and Hindi poetic words like Hijr, Tagaful, Vehshat, Musalsal, Qurbat, and Arzoo.",
    priority: "0.9",
    changefreq: "daily",
  },
  {
    path: "/guidelines",
    title: "Community Guidelines & Literary Sanctity | Ek Khawaab",
    description: "Our community rules ensuring masked identity protection, respectful discourse, and literary integrity on Ek Khawaab.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/privacy",
    title: "Privacy Vault & Anonymity Policy | Ek Khawaab",
    description: "How Ek Khawaab locks your personal identity details in a private vault while your pen name expresses your poetry.",
    priority: "0.5",
    changefreq: "monthly",
  },
];

for (const page of CORE_PAGES) {
  writeRouteHtml(page.path, {
    title: page.title,
    description: page.description,
    canonical: `${BASE_URL}${page.path === "/" ? "" : page.path}`,
    semanticHtml: page.editorial,
  });
  registerSitemapUrl(`${BASE_URL}${page.path === "/" ? "" : page.path}`, page.priority, page.changefreq);
}
console.log(`Pre-rendered ${CORE_PAGES.length} Core Pages.`);

// ----------------------------------------------------
// B. Topic Category Hubs (/topic/:topicSlug)
// ----------------------------------------------------
const topicKeys = Object.keys(TOPICS);
for (const key of topicKeys) {
  const topic = TOPICS[key];
  const matchingPoems = POEMS.filter(topic.filter);
  const routePath = `/topic/${topic.slug}`;
  const canonical = `${BASE_URL}${routePath}`;

  const semanticHtml = `
    <header>
      <nav aria-label="Breadcrumb">
        <a href="/">Home</a> / <a href="/feed">Feed</a> / <span>${topic.title}</span>
      </nav>
    </header>
    <main>
      <h1>${topic.heading}</h1>
      <p><strong>${topic.sub}</strong></p>
      <p>${topic.intro}</p>
      <section>
        <h2>Curated ${topic.title} Verses</h2>
        ${matchingPoems.map((p) => {
          const pSlug = getPoemSlug(p);
          return `
            <article>
              <h3><a href="/poetry/${pSlug}">${p.hinglish[0]}</a></h3>
              <p>by @${p.takhallus} &bull; ${p.format} &bull; ${p.mood}</p>
              <blockquote>${p.hinglish.join(" / ")}</blockquote>
              <p lang="hi">${p.hindi.join(" / ")}</p>
              <p lang="ur" dir="rtl">${p.urdu.join(" / ")}</p>
              <p><a href="/poetry/${pSlug}">Read full poem &amp; script translations &rarr;</a></p>
            </article>
          `;
        }).join("\n")}
      </section>
      <section>
        <h2>Explore Other Topics</h2>
        <nav>
          ${topicKeys.filter(k => k !== key).map(k => {
            const t = TOPICS[k];
            return `<a href="/topic/${t.slug}">${t.title}</a>`;
          }).join(" | ")}
        </nav>
      </section>
    </main>
  `;

  writeRouteHtml(routePath, {
    title: topic.seoTitle,
    description: topic.description,
    canonical,
    semanticHtml,
  });
  registerSitemapUrl(canonical, "0.85", "daily");
}
console.log(`Pre-rendered ${topicKeys.length} Topic Pages.`);

// ----------------------------------------------------
// C. Dedicated Poem Pages (/poetry/:slug)
// ----------------------------------------------------
for (const poem of POEMS) {
  const slug = getPoemSlug(poem);
  const routePath = `/poetry/${slug}`;
  const canonical = `${BASE_URL}${routePath}`;
  const firstLine = poem.hinglish[0] || "Shayari";
  const secondLine = poem.hinglish[1] || "";
  const title = `${firstLine} — ${poem.mood} Shayari in Hindi, Urdu & Hinglish | Ek Khawaab`;
  const description = `${firstLine}${secondLine ? ` / ${secondLine}` : ""}. Read this authentic ${poem.mood} ${poem.format} by ${poem.takhallus} in Hinglish, Devanagari Hindi, and Nastaliq Urdu with English translation on Ek Khawaab.`;

  // Find vocabulary in this poem
  const allPoemText = [...poem.hinglish, ...poem.hindi, ...poem.urdu].join(" ").toLowerCase();
  const vocabWords = LUGHAT.filter(w =>
    allPoemText.includes(w.roman.toLowerCase()) ||
    allPoemText.includes(w.hindi.toLowerCase()) ||
    allPoemText.includes(w.urdu)
  ).slice(0, 5);

  // Related poems
  const related = POEMS.filter(p => p.id !== poem.id && p.mood === poem.mood).slice(0, 3);

  const semanticHtml = `
    <header>
      <nav aria-label="Breadcrumb">
        <a href="/">Home</a> / <a href="/feed">Mehfil Feed</a> / <span>${firstLine}</span>
      </nav>
    </header>
    <main>
      <article>
        <h1>${firstLine}</h1>
        <p>
          Poet: <strong>@${poem.takhallus}</strong> &bull; Format: <strong>${poem.format}</strong> &bull; Mood: <strong>${poem.mood}</strong>
        </p>

        <section>
          <h2>All Scripts &amp; Poetic Meaning (Tashreeh)</h2>
          <div>
            <h3>हिंदी में शायरी (Devanagari Hindi)</h3>
            ${poem.hindi.map(l => `<p>${l}</p>`).join("")}
          </div>
          <div dir="rtl">
            <h3>اردو شاعری (Nastaliq Urdu)</h3>
            ${poem.urdu.map(l => `<p>${l}</p>`).join("")}
          </div>
          <div>
            <h3>Roman Hinglish</h3>
            ${poem.hinglish.map(l => `<p>${l}</p>`).join("")}
          </div>
          <div>
            <h3>English Translation &amp; Tashreeh</h3>
            ${poem.english.map(l => `<p>"${l}"</p>`).join("")}
          </div>
        </section>

        ${vocabWords.length > 0 ? `
          <section>
            <h2>Deep Vocabulary in this Verse (Lughat)</h2>
            <ul>
              ${vocabWords.map(w => `
                <li>
                  <a href="/dictionary/${getWordSlug(w)}"><strong>${w.roman}</strong> (${w.hindi} &bull; ${w.urdu})</a>: ${w.meaning}
                </li>
              `).join("")}
            </ul>
          </section>
        ` : ""}

        ${related.length > 0 ? `
          <section>
            <h2>More in ${poem.mood} Shayari</h2>
            <ul>
              ${related.map(r => `
                <li>
                  <a href="/poetry/${getPoemSlug(r)}">"${r.hinglish[0]}"</a> by @${r.takhallus}
                </li>
              `).join("")}
            </ul>
          </section>
        ` : ""}

        <p>
          <a href="/card-studio">Customize in Card Studio</a> |
          <a href="/feed">Back to Mehfil Feed</a>
        </p>
      </article>
    </main>
  `;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "name": firstLine,
    "headline": firstLine,
    "author": {
      "@type": "Person",
      "name": poem.takhallus,
    },
    "inLanguage": ["hi", "ur", "en"],
    "genre": poem.format,
    "keywords": `${poem.mood}, ${poem.format}, hindi shayari, urdu poetry, hinglish poetry`,
    "text": poem.hinglish.join("\n"),
    "publisher": {
      "@type": "Organization",
      "name": "Ek Khawaab",
      "url": BASE_URL,
    },
  };

  writeRouteHtml(routePath, {
    title,
    description,
    canonical,
    semanticHtml,
    jsonLd,
  });
  registerSitemapUrl(canonical, "0.8", "weekly");
}
console.log(`Pre-rendered ${POEMS.length} Dedicated Poem Pages.`);

// ----------------------------------------------------
// D. Dedicated Dictionary Pages (/dictionary/:wordSlug)
// ----------------------------------------------------
for (const word of LUGHAT) {
  const wordSlug = getWordSlug(word);
  const routePath = `/dictionary/${wordSlug}`;
  const canonical = `${BASE_URL}${routePath}`;
  const title = `${word.roman} Meaning in Hindi, Urdu & English with Shayari Examples | Ek Khawaab Dictionary`;
  const description = `Learn the poetic meaning of ${word.roman} (${word.hindi} • ${word.urdu}) in Hindi, Urdu, and English. Pronunciation: /${word.say}/. Understand how classical shayar like Ghalib and Jaun Elia use it with authentic couplet examples.`;

  // Poems using this word
  const matchingPoems = POEMS.filter(p => {
    const text = [...p.hinglish, ...p.hindi, ...p.urdu].join(" ").toLowerCase();
    return (
      text.includes(word.roman.toLowerCase()) ||
      text.includes(word.hindi.toLowerCase()) ||
      text.includes(word.urdu)
    );
  }).slice(0, 3);

  const relatedWords = LUGHAT.filter(w => w.roman !== word.roman).slice(0, 6);

  const semanticHtml = `
    <header>
      <nav aria-label="Breadcrumb">
        <a href="/">Home</a> / <a href="/dictionary">Lughat Dictionary</a> / <span>${word.roman}</span>
      </nav>
    </header>
    <main>
      <article>
        <h1>${word.roman} (${word.hindi} &bull; ${word.urdu}) — Meaning, Pronunciation &amp; Poetic Usage</h1>
        <p><strong>Pronunciation:</strong> /${word.say}/ &bull; <strong>Origin:</strong> Urdu &bull; <strong>English Meaning:</strong> ${word.meaning}</p>
        
        <section>
          <h2>Literary Context &amp; Classical Usage</h2>
          <p>${word.context}</p>
          <blockquote>"${word.example}"</blockquote>
        </section>

        ${matchingPoems.length > 0 ? `
          <section>
            <h2>Poems on Ek Khawaab Featuring "${word.roman}"</h2>
            <ul>
              ${matchingPoems.map(p => `
                <li>
                  <a href="/poetry/${getPoemSlug(p)}">"${p.hinglish[0]}"</a> by @${p.takhallus}
                </li>
              `).join("")}
            </ul>
          </section>
        ` : ""}

        <section>
          <h2>Related Poetic Words in Lughat</h2>
          <nav>
            ${relatedWords.map(w => `<a href="/dictionary/${getWordSlug(w)}">${w.roman} (${w.meaning})</a>`).join(" | ")}
          </nav>
        </section>

        <p><a href="/dictionary">&larr; Back to Full Urdu Dictionary</a></p>
      </article>
    </main>
  `;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "name": word.roman,
    "alternateName": [word.hindi, word.urdu],
    "description": word.meaning,
    "inDefinedTermSet": {
      "@type": "DefinedTermSet",
      "name": "Ek Khawaab Urdu & Hindi Poetry Lughat",
      "url": `${BASE_URL}/dictionary`,
    },
    "url": canonical,
  };

  writeRouteHtml(routePath, {
    title,
    description,
    canonical,
    semanticHtml,
    jsonLd,
  });
  registerSitemapUrl(canonical, "0.7", "weekly");
}
console.log(`Pre-rendered ${LUGHAT.length} Dedicated Dictionary Pages.`);

// ----------------------------------------------------
// E. Master Sitemap & Robots Generation
// ----------------------------------------------------
let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
sitemapXml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
sitemapXml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

for (const entry of sitemapUrls) {
  sitemapXml += `  <url>\n`;
  sitemapXml += `    <loc>${entry.loc}</loc>\n`;
  sitemapXml += `    <lastmod>${LAST_MOD}</lastmod>\n`;
  sitemapXml += `    <changefreq>${entry.changefreq}</changefreq>\n`;
  sitemapXml += `    <priority>${entry.priority}</priority>\n`;
  if (entry.loc === BASE_URL || entry.loc === `${BASE_URL}/`) {
    sitemapXml += `    <image:image>\n`;
    sitemapXml += `      <image:loc>${BASE_URL}/logo.png</image:loc>\n`;
    sitemapXml += `      <image:title>Ek Khawaab — Anonymous Poetry Sanctuary</image:title>\n`;
    sitemapXml += `      <image:caption>Literary sanctuary for Hindi, Urdu and Hinglish shayari</image:caption>\n`;
    sitemapXml += `    </image:image>\n`;
  }
  sitemapXml += `  </url>\n`;
}
sitemapXml += `</urlset>\n`;

const robotsTxt = `User-agent: *
Allow: /
Disallow: /private-vault
Disallow: /api/

Sitemap: https://ek-khawaab.vercel.app/sitemap.xml
`;

for (const baseDir of outputDirs) {
  fs.writeFileSync(path.join(baseDir, "sitemap.xml"), sitemapXml, "utf8");
  fs.writeFileSync(path.join(baseDir, "robots.txt"), robotsTxt, "utf8");
}

console.log(`Generated sitemap.xml with ${sitemapUrls.length} verified URLs.`);
console.log(`Generated robots.txt across all output targets.`);
console.log("--- Static Pre-Rendering Completed Successfully ---");
