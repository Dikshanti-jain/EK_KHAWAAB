# Packet 04 — Edge Cache, `.htaccess` & Origin Lock-down

**Owner:** Noor (SEO/cache) · Vikram (topology) · **Risk:** low · **Time:** 2 h · **Reversible:** yes

Today every HTML request reaches Hostinger. There is no CDN in front of the apex, `dist/index.html` is 64.5 kB (151.9 kB for `/feed`), and `.htaccess` sends `max-age=0` with no shared-cache directive. At 1,000 CCU that is ~1.5M HTML requests/month against a shared LiteSpeed plan — the origin cliff described in blueprint §1.4A.

This packet puts Cloudflare in front, makes HTML cacheable for 5 minutes at the edge, makes hashed assets immutable, and closes the soft-404 and header gaps. It changes **no visual design and no copy**.

## 0. The caching contract

```
browser ──► Cloudflare edge ──► Hostinger LiteSpeed ──► dist/
             │ cache HIT 95%        │ cache MISS 5%
             │ s-maxage=300          │ max-age=0
             ▼                       ▼
        stale-while-revalidate=86400 (serve stale, refresh in background)
```

| Path | Browser TTL | Edge TTL | Why |
|---|---|---|---|
| `/`, `/feed`, `/dictionary/*`, `/topics/*` | `max-age=0` (revalidate) | `s-maxage=300` + SWR 1 day | shell changes on deploy; 5 min is invisible |
| `/assets/*` | 1 year, `immutable` | 1 year | hashed filenames |
| `logo.png`, `logo-icon.png`, images | 7 days | 30 days | unhashed; purge on change |
| `sitemap*.xml`, `robots.txt` | 1 h | 1 h | crawl freshness |
| `/api/*` (Render host) | no-store | bypass | never cache AI responses at the edge |
| `/.well-known/*` | 1 h | bypass | ACME/verification |

The critical rule: **HTML is cached at the edge but not in the browser.** A deploy propagates in ≤ 5 minutes without a purge, and a user never gets a stale shell for a day after a release.

## 1. Replacement `public/.htaccess`

Full file. Keep a copy of the current one as `.htaccess.bak` on the server before uploading.

```apache
# ============================================================================
# Ek Khwaab — Hostinger LiteSpeed / Apache
# Order matters: HTTPS → canonical host → directory index → static → 404 → SPA
# ============================================================================

Options -Indexes
DirectoryIndex index.html

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # 1. Force HTTPS. Both conditions must agree, so a Cloudflare "Flexible"
  #    setup (HTTPS off at origin, X-Forwarded-Proto=https) cannot loop.
  RewriteCond %{HTTPS} !=on
  RewriteCond %{HTTP:X-Forwarded-Proto} !https
  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

  # 2. Canonical host: www → apex, one hop.
  RewriteCond %{HTTP_HOST} ^www\.ekkhwaab\.in$ [NC]
  RewriteRule ^ https://ekkhwaab.in%{REQUEST_URI} [L,R=301]

  # 3. Pre-rendered directory index: /dictionary/tagaful → .../index.html
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteCond %{REQUEST_FILENAME}/index.html -f
  RewriteRule ^(.+?)/?$ $1/index.html [L]

  # 4. Real files (assets, sitemap, robots, images) are served directly.
  RewriteCond %{REQUEST_FILENAME} -f
  RewriteRule ^ - [L]

  # 5. Unknown content routes must 404, not return the SPA shell with 200.
  #    Googlebot currently discovers infinite soft-404s through shared links.
  #    /poetry/* that exists is already served by rule 3; the Cloudflare SEO
  #    Worker (blueprint §3.8) handles new slugs before the origin sees them.
  RewriteRule ^(poetry|dictionary)(/|$) - [R=404,L]

  # 6. SPA fallback for known client routes only.
  RewriteRule ^ /index.html [L]
</IfModule>

# ----------------------------------------------------------------------------
# MIME types
# ----------------------------------------------------------------------------
<IfModule mod_mime.c>
  AddType application/xml .xml
  AddType text/plain .txt
  AddType image/avif .avif
  AddType image/webp .webp
  AddType font/woff2 .woff2
</IfModule>

# ----------------------------------------------------------------------------
# Compression (LiteSpeed does this natively; this is the Apache fallback)
# ----------------------------------------------------------------------------
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/css text/xml
  AddOutputFilterByType DEFLATE application/javascript application/json
  AddOutputFilterByType DEFLATE application/xml image/svg+xml
</IfModule>

# ----------------------------------------------------------------------------
# Security headers
# ----------------------------------------------------------------------------
<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"
  Header always set Cross-Origin-Opener-Policy "same-origin"
  Header always set X-Frame-Options "DENY"

  # frame-ancestors/object-src/base-uri are the directives X-Frame-Options
  # cannot express. Turnstile needs challenges.cloudflare.com in script/frame/
  # connect (packet 02); YouTube remains allowed for embeds.
  Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://challenges.cloudflare.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.onrender.com https://api.ekkhwaab.in https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self';"
</IfModule>

# Per-path robots policy. Global "index, follow" currently leaks indexable
# /auth, /profile and /letters pages into the index.
<IfModule mod_setenvif.c>
  SetEnvIf Request_URI "^/(auth|profile|letters|secret-letters|private-vault)" NOINDEX
</IfModule>
<IfModule mod_headers.c>
  Header set X-Robots-Tag "noindex, nofollow, noarchive" env=NOINDEX
  Header set X-Robots-Tag "index, follow, max-image-preview:large, max-snippet:-1" env=!NOINDEX
</IfModule>

# ----------------------------------------------------------------------------
# Cache-Control
# ----------------------------------------------------------------------------
<IfModule mod_setenvif.c>
  # Only hashed build output gets a one-year immutable cache. Root-level
  # SVGs/JS must not be frozen for a year.
  SetEnvIf Request_URI "^/assets/" IMMUTABLE
</IfModule>
<IfModule mod_headers.c>
  # HTML: revalidate in the browser, cache 5 min at the edge, serve stale for
  # a day while refreshing. This is the line that removes the origin cliff.
  <FilesMatch "\.html$">
    Header set Cache-Control "public, max-age=0, s-maxage=300, stale-while-revalidate=86400"
  </FilesMatch>

  # Hashed build assets: immutable for a year.
  Header set Cache-Control "public, max-age=31536000, immutable" env=IMMUTABLE

  # Unhashed images: shorter, purge on change.
  <FilesMatch "\.(png|jpg|jpeg|gif|ico)$">
    Header set Cache-Control "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400"
  </FilesMatch>

  <FilesMatch "^(sitemap.*\.xml|robots\.txt)$">
    Header set Cache-Control "public, max-age=3600, s-maxage=3600"
  </FilesMatch>
</IfModule>

# Apache fallback if mod_headers is unavailable.
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html "access plus 0 seconds"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 month"
  ExpiresByType image/png "access plus 1 month"
  ExpiresByType image/webp "access plus 1 month"
  ExpiresByType font/woff2 "access plus 1 year"
</IfModule>
```

Three deliberate changes from the current file:

| Change | Reason |
|---|---|
| `max-age=0, s-maxage=300, stale-while-revalidate=86400` on HTML | current `max-age=0` alone forbids shared caching |
| `^(poetry\|dictionary)(/\|$) → 404` | stops infinite soft-404 crawl waste (blueprint §3.8) |
| `X-Robots-Tag` opt-in via `SetEnvIf` | `/auth`, `/profile`, `/letters` must not be indexed |

> ✅ DO upload `.htaccess` **after** `dist/` is in place. If you upload it first, the rewrite rules have no files to serve and every route 404s until the upload completes.
>
> ❌ DON'T add `Header always set Cache-Control` for `/api/*`. The API is a different host; an origin header here does nothing and creates a false sense of protection.

### Why `.html` and not `text/html`

`<FilesMatch>` matches the filename, not the response MIME type. Since the prerender writes `dist/feed/index.html`, `\.html$` catches it. A `Header set Cache-Control` on `text/html` would also work via `Header set` + env, but it is harder to scope and LiteSpeed applies it to error documents too.

## 2. Cloudflare configuration

Do this in the dashboard, then export the rules to Terraform only if the team grows. A one-page runbook beats a half-maintained IaC repo at this size.

### 2.1 DNS and TLS

| Record | Proxy | TTL |
|---|---|---|
| `ekkhwaab.in` A/AAAA → Hostinger | **Proxied (orange)** | Auto |
| `www` CNAME → `ekkhwaab.in` | Proxied | Auto |
| `api` CNAME → `ek-khawaab-api.onrender.com` | Proxied | Auto |

| Setting | Value | Why |
|---|---|---|
| SSL/TLS mode | **Full (strict)** | Flexible causes redirect loops and sends plaintext to origin |
| Always Use HTTPS | On | edge redirect, cheaper than origin |
| Automatic HTTPS Rewrites | On | mixed-content cleanup |
| Minimum TLS | 1.2 | 1.0/1.1 are dead |
| TLS 1.3 | On | — |
| HSTS | On, 12 months, include subdomains, preload | matches `.htaccess` |
| Opportunistic Encryption | On | — |

### 2.2 Cache Rules (in order; first match wins)

| # | Name | Expression | Action |
|---|---|---|---|
| 1 | bypass-api | `http.host eq "api.ekkhwaab.in"` | Bypass cache |
| 2 | assets-immutable | `(http.host eq "ekkhwaab.in" and starts_with(http.request.uri.path, "/assets/"))` | Eligible; Edge TTL **1 year**; Browser TTL **1 year**; respect origin |
| 3 | seo-files | `(http.request.uri.path matches "^/(sitemap.*\.xml\|robots\.txt)$")` | Eligible; Edge TTL **1 hour** |
| 4 | html-edge | `(http.host eq "ekkhwaab.in" and not starts_with(http.request.uri.path, "/assets/") and not starts_with(http.request.uri.path, "/api/"))` | Eligible; Edge TTL **5 minutes**; Browser TTL **respect origin**; cache key = host + path (no cookies, no query string) |

`seo-files` must come before `html-edge`: rules are evaluated top-down, and the HTML rule would otherwise capture the sitemap first and give it a 5-minute TTL.

Notes:

- Rule 4 must **not** cache by cookie. The app stores state in `localStorage`, not cookies, so the HTML is identical for every user. If a cookie is ever introduced for A/B tests, add it to the cache key or split the rule.
- `/listen-together?room=ABC123` is a client route. Query strings are ignored by default in the cache key; that is correct here because the HTML shell is identical for every room. Do not add `room` to the key — it would fragment the cache into thousands of entries for no benefit.
- If Cloudflare's plan does not expose "Respect origin" browser TTL, set Browser TTL to **2 minutes** for rule 4. The origin header remains the source of truth for other clients.

### 2.3 Speed and safety toggles

| Setting | Value | Why |
|---|---|---|
| Brotli | On | 15–20% smaller than gzip for JS |
| Early Hints | On | preloads the entry chunk while HTML streams |
| HTTP/2 + HTTP/3 | On | — |
| Rocket Loader | **Off** | it defers scripts and breaks React hydration order |
| Auto Minify | **Off** | deprecated, and it has corrupted modern JS in the past |
| Email Address Obfuscation | **Off** | mutates HTML before hydration |
| Bot Fight Mode | Off (or "verified bots allowed") | must not challenge Googlebot |
| Tiered Cache | On | fewer origin pulls on a cache miss |
| 0-RTT Connection Resumption | On | faster repeat visits |

### 2.4 One WAF rate-limit rule (free plan allows one)

| Field | Value |
|---|---|
| Expression | `(http.host eq "api.ekkhwaab.in" and starts_with(http.request.uri.path, "/api/ai/"))` |
| Requests | 30 per 1 minute per IP |
| Action | Block for 60 s |
| Response | 429 with `Retry-After: 60` |

This is a coarse edge ceiling. The real fairness logic remains in Render (packet 02); the WAF rule exists so a single script cannot occupy the origin's connection pool.

### 2.5 Edge identity transform (required by packet 02)

| Field | Value |
|---|---|
| Type | Transform Rule → Request Header → Set |
| Expression | `http.host eq "api.ekkhwaab.in"` |
| Header | `X-Edge-Secret` = `EDGE_SHARED_SECRET` from Render |
| Behaviour | overwrite if present |

Without the overwrite, a client can send the header itself and forge `CF-Connecting-IP`.

### 2.6 Origin lock-down (what shared hosting actually allows)

The goal is that requests to the Hostinger IP bypassing Cloudflare are refused. On shared LiteSpeed this is only partially achievable:

| Option | Support | Verdict |
|---|---|---|
| Cloudflare proxy (orange cloud) | yes | **required**; hides the origin from DNS |
| Hostinger IP Access Control / firewall allowlist of Cloudflare ranges | plan-dependent | use if available; keep the current admin IP allowed |
| `.htaccess` `Require ip` with the Cloudflare ranges | works, but the list changes and a mistake locks out the site | not recommended on shared hosting |
| Cloudflare Authenticated Origin Pulls (mTLS) | not exposed by Hostinger shared | unavailable |
| Change the origin IP after an attack | hPanel | last resort |

If the plan has no firewall, state the residual risk plainly: the origin IP can be discovered through DNS history or a direct scan, and an attacker can bypass the edge cache and WAF. The mitigations that remain are the origin rate limits (Render/DB), the `.htaccess` 404 rule, and the fact that the origin serves only static files — there is no admin panel or database on it.

Do **not** block the Cloudflare ranges in `.htaccess` unless you have a tested rollback path. A wrong CIDR takes the whole site down and looks identical to an origin failure.

## 3. Deploy sequence (the part that breaks sites)

Hashed assets are additive. HTML is not. The safe order is:

```
1. build                       → dist/
2. upload dist/assets/*        → never delete old assets in this step
3. upload dist/*.html + routes → overwrite
4. upload .htaccess            → headers apply to subsequent requests
5. purge Cloudflare            → purge "/" and "/feed" (or everything)
6. verify                      → §4
7. delete assets older than 2 generations (after 24 h)
```

> ✅ DO keep at least the previous generation of `/assets/*` for 24 hours. A browser holding a 5-minute-old HTML may request the previous hashed chunk; deleting it turns a deploy into a white screen for that user.
>
> ❌ DON'T use `lftp --delete` on `/assets/` in the same run that uploads new HTML. The current deploy guard (blueprint §3.9) must exclude old assets from deletion until the next release.

If the host supports atomic release directories, prefer:

```
public_html_prev/  ← symlink target before deploy
public_html_next/  ← upload here
mv public_html public_html_old && mv public_html_next public_html
```

That makes rollback a symlink swap (< 5 s) instead of a re-upload.

## 4. Verify

```bash
# HTML: first request MISS, second HIT, 5-minute edge TTL
curl -sI https://ekkhwaab.in/feed | grep -iE 'cache-control|cf-cache-status|age'
# cache-control: public, max-age=0, s-maxage=300, stale-while-revalidate=86400
# cf-cache-status: MISS   (first)
# cf-cache-status: HIT    (second, age: 1..300)

# Assets: immutable
curl -sI https://ekkhwaab.in/assets/$(ls dist/assets | grep '^index-.*\.js$' | head -1) \
  | grep -iE 'cache-control|cf-cache-status'
# cache-control: public, max-age=31536000, immutable

# Compression
curl -s -o /dev/null -w '%{size_download}\n' --compressed https://ekkhwaab.in/
curl -s -o /dev/null -w '%{size_download}\n' https://ekkhwaab.in/

# Soft 404 is gone
curl -s -o /dev/null -w '%{http_code}\n' https://ekkhwaab.in/poetry/this-does-not-exist
# 404

# noindex on private routes
curl -sI https://ekkhwaab.in/auth | grep -i x-robots-tag
# noindex, nofollow, noarchive

# security headers
curl -sI https://ekkhwaab.in/ | grep -iE 'content-security-policy|x-frame-options|permissions-policy'
# frame-ancestors 'none'; object-src 'none'; base-uri 'self' must be present

# API is never edge-cached
curl -sI https://api.ekkhwaab.in/health | grep -i cf-cache-status
# BYPASS (or no header)

# www → apex, one hop
curl -sI https://www.ekkhwaab.in/feed | grep -iE '^HTTP|^location'
# 301 https://ekkhwaab.in/feed
```

Acceptance:

- [ ] second request to `/feed` returns `cf-cache-status: HIT`
- [ ] `age` is typically ≤ 300 on HTML; during origin trouble, `cf-cache-status: STALE` with a larger `age` is the SWR window working, not a bug
- [ ] `/assets/*` returns `immutable`
- [ ] unknown `/poetry/*` and `/dictionary/*` return 404, not 200
- [ ] `/auth`, `/profile`, `/letters`, `/private-vault` return `noindex`
- [ ] CSP contains `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`
- [ ] Turnstile still renders on `/ai-poet` (CSP allows `challenges.cloudflare.com`)
- [ ] `www` redirects in one hop; HTTPS redirect does not loop behind Cloudflare
- [ ] `api.ekkhwaab.in/health` is not cached
- [ ] Lighthouse mobile: LCP < 1.8 s on a warm cache

## 5. Rollback

| Change | Rollback | Time |
|---|---|---|
| `.htaccess` | restore `.htaccess.bak`, purge cache | 2 min |
| Cache rule | disable rule 4 (HTML), keep assets | 1 min |
| 404 rule | comment rule 5; SPA fallback resumes | 2 min |
| CSP | remove the `Content-Security-Policy` header; the app is not dependent on it to function | 1 min |
| Cloudflare proxy | grey-cloud the record; origin is exposed again but reachable | 1 min |

Keep the previous `.htaccess` on the server, not only in git. The file is easy to restore from the repo, but only if the deploy pipeline still works — and a broken `.htaccess` can take the pipeline's verification step down with it.

## 6. What this does not fix

| Problem | Where it is handled |
|---|---|
| HTML is still a static snapshot for SEO | Cloudflare Worker SEO shell (blueprint §3.8) |
| Fonts still block render | self-host + preload (blueprint §3.3/§3.8) |
| UGC poems are invisible to Google | `poems.slug` + dynamic sitemap (packet 01/blueprint §3.8) |
| Origin IP is still discoverable via DNS history | Cloudflare proxy + host firewall; not solvable in `.htaccess` |

The honest summary: this packet removes the origin cliff and the crawl waste. It does not make the site indexable at the speed the product needs; that is the Worker, and it is a separate deploy.
