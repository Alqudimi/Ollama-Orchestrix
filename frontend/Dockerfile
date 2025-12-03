# =============================================================================
# Dockerfile - React Frontend
# Multi-stage build for production optimization
# =============================================================================

# Stage 1: Dependencies
FROM node:20-alpine as deps

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci --only=production=false

# Stage 2: Builder
FROM node:20-alpine as builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production

RUN npm run build

# Stage 3: Production (for standalone static serving or copying to nginx)
FROM node:20-alpine as production

LABEL maintainer="Ollama Manager Team"
LABEL description="React Frontend for Ollama Management"
LABEL version="1.0.0"

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist

USER nextjs

EXPOSE 3000

CMD ["npx", "serve", "-s", "dist", "-l", "3000"]
