# =====================================================================
# STAGE 1: BUILD ENVIRONMENT
# =====================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy full application source
COPY . .

# Environment variables for build
ARG VITE_SITE_URL=https://ekkhwaab.in
ARG VITE_API_BASE_URL=https://ek-khawaab-api.onrender.com
ARG VITE_SUPABASE_URL=https://pbotpkpdqvtagkwbpaxz.supabase.co
ARG VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBib3Rwa3BkcXZ0YWdrd2JwYXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MzExODksImV4cCI6MjEwODUwNzE4OX0.rsM03OF7pdMJRY4oYgMlZr7fFgBfjs07Jh81FLo8760

ENV VITE_SITE_URL=$VITE_SITE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV NODE_ENV=production

# Compile application bundle and generate static pre-rendered pages in dist/
RUN npm run build

# =====================================================================
# STAGE 2: PRODUCTION RUNTIME (NGINX ALPINE)
# =====================================================================
FROM nginx:1.27-alpine AS runner

# Remove default nginx configuration
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy production nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy compiled static & pre-rendered bundle
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Production Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

