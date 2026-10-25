# EK KHAWAAB — VERCEL DEPLOYMENT & RELEASE GUIDE

**Target Platform**: Vercel Serverless Functions & Edge Network  
**Output Specification**: Vercel Build Output API v3 (`.vercel/output/`)

---

## 1. Build & Preset Compatibility

The application is built using **TanStack Start** with **Nitro**.
Nitro natively provides a `vercel` preset that generates:
- `.vercel/output/static/`: Pre-rendered static assets, CSS, images, and HTML.
- `.vercel/output/functions/__server.func/`: Vercel Serverless Function handling SSR, AI endpoints, and API server actions.
- `.vercel/output/nitro.json` and `.vercel/output/config.json`: Deployment manifest and route rewrite rules.

### Production Build Command:
```bash
# On Vercel CI (VERCEL=1 is auto-set, or via explicit build command):
npm run build
```

---

## 2. Environment Variables Configuration

Set these environment variables in your Vercel Dashboard under **Project Settings → Environment Variables**:

| Variable Name | Environment | Required | Description |
| :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Production, Preview, Dev | **Yes** | Your Supabase project URL (e.g. `https://your-project.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Production, Preview, Dev | **Yes** | Supabase publishable anonymous key (`sb_publishable_...`) |
| `SUPABASE_URL` | Production, Preview | **Yes** | Server-side Supabase URL |
| `SUPABASE_PUBLISHABLE_KEY` | Production, Preview | **Yes** | Server-side Supabase public key |
| `GROQ_API_KEY` | Production, Preview | **Recommended** | Groq API Key for Shayar-e-Khawaab (`gsk_...`) |
| `GROQ_MODEL` | Production, Preview | Optional | Groq Model ID (defaults to `openai/gpt-oss-120b`) |
| `OPENAI_API_KEY` | Production, Preview | Optional | OpenAI API key for AI Poet generation (fallback to curated verses if omitted) |
| `LOVABLE_API_KEY` | Production, Preview | Optional | Lovable Gateway API Key (optional alternative to OpenAI) |
| `NITRO_PRESET` | Production, Preview | Recommended | Set to `vercel` (automatically configured when building on Vercel) |

---

## 3. Deployment Checklist

1. **Connect GitHub Repository**: Import the repository in Vercel.
2. **Framework Preset**: Select **Other** (or Vite).
3. **Build Command**: `npm run build`
4. **Output Directory**: `.vercel/output` (automatically detected by Vercel for Nitro builds).
5. **Install Command**: `npm install`
6. **Deploy & Smoke Test**: Run the Smoke Test suite on preview deployment URL before assigning production domain.
