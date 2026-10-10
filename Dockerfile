# Multi-stage production Dockerfile for Voyage (Node 22 LTS + Express + React/Vite)
# Builds client and server, then packages a slim, secure production runtime.

# --- Stage 1: Build ---
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Build tools, only used if a native module (argon2) has no prebuilt binary for this platform
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package manifests first for efficient layer caching
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install all dependencies (including devDependencies needed for build)
RUN npm ci --no-audit --no-fund

# Copy full source tree
COPY . .

# Build both server (TypeScript -> dist) and client (Vite -> dist)
RUN npm run build

# Production dependencies of the server only: the client's libraries are already bundled into client/dist
RUN rm -rf node_modules server/node_modules client/node_modules \
    && npm ci --omit=dev --workspace=@voyage/server --include-workspace-root --no-audit --no-fund

# --- Stage 2: Production Runtime ---
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV CLIENT_DIST_DIR=client/dist
ENV TRUST_PROXY=1

# Run as non-privileged node user for security
USER node

COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/node_modules ./node_modules

# Server build and runtime package
COPY --chown=node:node --from=builder /app/server/package.json ./server/
COPY --chown=node:node --from=builder /app/server/dist ./server/dist

# Client built SPA, served by the API on the same origin
COPY --chown=node:node --from=builder /app/client/package.json ./client/
COPY --chown=node:node --from=builder /app/client/dist ./client/dist

# HTTP port (set the Container App target port / App Service WEBSITES_PORT to match)
EXPOSE 8080

# Health check matching Voyage's /api/v1/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 8080) + '/api/v1/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the production API server
CMD ["node", "server/dist/index.js"]
