# Liderlik Aynası — Next.js (standalone) konteyneri
# Railway/Docker'da çalışır; Vercel/Netlify'ı etkilemez (onlar Dockerfile kullanmaz).
# Debian-slim taban: sharp (görsel işleme) ve native bağımlılıklar sorunsuz çalışsın.

FROM node:22-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# 1) Bağımlılıklar — yalnız lockfile değişince yeniden kurulur (katman önbelleği)
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# 2) Derleme — NEXT_PUBLIC_* derleme anında client paketine gömülür, ARG ile geçilir
FROM base AS build
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3) Çalıştırma — yalnız standalone çıktısı + statikler (küçük, güvenli imaj)
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN groupadd -r app && useradd -r -g app app
COPY --from=build /app/public ./public
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3000
CMD ["node", "server.js"]
