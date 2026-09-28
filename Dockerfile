# Production image for self-hosting (Vercel does not need this).
#   docker build -t fix-it-now .
#   docker run -p 3000:3000 --env-file .env.production fix-it-now
# Run migrations separately before starting: DATABASE_URL=... npm run db:migrate

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Public values are baked into the browser bundle at build time.
ARG NEXT_PUBLIC_PHONE NEXT_PUBLIC_VIBER NEXT_PUBLIC_WHATSAPP NEXT_PUBLIC_EMAIL NEXT_PUBLIC_TURNSTILE_SITE_KEY NEXT_PUBLIC_SHOW_VARIANTS
RUN npm run build

FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
CMD ["node", "server.js"]
