# Tasks Microservice Dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm install -D typescript @types/node tsx

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3003

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 serviceuser

COPY --from=builder --chown=serviceuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=serviceuser:nodejs /app/src/lib ./src/lib
COPY --from=builder --chown=serviceuser:nodejs /app/src/app/api/tasks ./src/app/api/tasks
COPY --from=builder --chown=serviceuser:nodejs /app/tsconfig.json ./

USER serviceuser

EXPOSE 3003

CMD ["npx", "tsx", "src/app/api/tasks/server.ts"]
