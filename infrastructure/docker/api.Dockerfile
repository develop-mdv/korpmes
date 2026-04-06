FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# Copy everything and install + build in one stage
# (pnpm symlinks break when copied between stages, so we keep it together)
FROM base AS builder
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @corp/shared-types build && \
    pnpm --filter @corp/shared-constants build && \
    pnpm --filter @corp/shared-validation build && \
    pnpm --filter @corp/api build
RUN pnpm --filter @corp/api deploy --prod /app/deployed

# Production
FROM node:20-alpine AS runner
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
WORKDIR /app

COPY --from=builder /app/deployed ./

USER nestjs
EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "dist/apps/api/src/main.js"]
