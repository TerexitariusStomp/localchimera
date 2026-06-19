# Dockerfile for QVAC Chimera — Hardened Container with @qvac/sdk
FROM node:20-bookworm AS builder

WORKDIR /app

# Install build tools for native modules (hypercore, hyperswarm, llama.cpp, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git python3 make g++ cmake bash curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ─── Backend deps (includes @qvac/sdk) ───
COPY package*.json ./
RUN npm install && \
    find node_modules -path "*/prebuilds/android-*" -delete && \
    find node_modules -path "*/prebuilds/ios-*" -delete && \
    find node_modules -path "*/prebuilds/darwin-*" -delete && \
    find node_modules -path "*/prebuilds/win32-*" -delete && \
    find node_modules -path "*/prebuilds/linux-arm64" -delete && \
    rm -rf node_modules/.cache 2>/dev/null || true

# ─── Frontend deps & build ───
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# ─── Copy source & config ───
COPY src/ ./src/
COPY config.json ./

# ─── Runtime stage (hardened) ───
FROM node:20-bookworm-slim AS runtime

WORKDIR /app

# Install runtime deps only
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for hardened container
RUN groupadd -r chimera && useradd -r -g chimera -s /bin/false chimera

# Copy built app from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/config.json ./
COPY --from=builder /app/package.json ./

# ─── Data volume mount point ───
RUN mkdir -p /app/llmwiki-data/wiki /app/llmwiki-data/index /app/data \
    && chown -R chimera:chimera /app

# Hardened container: run as non-root, no shell access
USER chimera

# Environment
ENV NODE_ENV=production
ENV PORT=3002
ENV OPENVIKING_URL=http://127.0.0.1:1933
ENV OPENVIKING_API_KEY=chimera-local-dev-key

# Expose wiki web server port
EXPOSE 3002

# Health check on wiki API
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -fs http://localhost:3002/api/status || exit 1

# Start with @qvac/sdk running inside hardened container
CMD ["node", "src/index.js"]
