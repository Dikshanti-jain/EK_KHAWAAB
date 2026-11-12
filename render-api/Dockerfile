# =====================================================================
# EK KHWAAB AI BACKEND — DOCKERFILE
# Production Node.js Microservice for Groq AI Shayar & Translation
# =====================================================================
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3001

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy server application
COPY server.mjs ./

# Non-root user for cybersecurity compliance
USER node

# Expose internal API port
EXPOSE 3001

# Healthcheck targeting GET /health
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "server.mjs"]

