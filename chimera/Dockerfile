# Dockerfile for QVAC-Pear Miner Node with centralized inference
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    git \
    python3 \
    py3-pip \
    build-base \
    bash \
    curl

# Copy root package files and install backend deps
COPY package*.json ./
RUN npm ci --only=production

# Copy and build frontend
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci
COPY frontend/ ./
RUN npx vite build
WORKDIR /app

# Copy source code and config
COPY src/ ./src/
COPY config.json ./
COPY ecosystem.config.cjs ./
COPY start.sh stop.sh ./
RUN chmod +x start.sh stop.sh

# Use .env.example as default if no .env is provided
COPY .env.example .env.example
RUN [ -f .env ] || cp .env.example .env

# Create data and logs directories
RUN mkdir -p /app/data /app/logs

# Environment
ENV NODE_ENV=production

# Expose API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -fs http://localhost:3000/api/status || exit 1

# Start the application
CMD ["node", "src/index.js"]
