FROM node:22-alpine AS deps

WORKDIR /app
COPY fronteend-1/package*.json ./
RUN npm ci

FROM node:22-alpine AS builder

WORKDIR /app
ARG NEXT_PUBLIC_API_BASE_URL=
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
COPY --from=deps /app/node_modules ./node_modules
COPY fronteend-1/ ./
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
