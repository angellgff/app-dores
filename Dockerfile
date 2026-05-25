# ═══════════════════════════════════════════════════════════════════════════════
# Dores App — Dockerfile optimizado para producción
# Build multi-etapa: Node.js (Expo web export) → Nginx (servir estáticos)
#
# IMPORTANTE: Las variables EXPO_PUBLIC_* se incrustan en el bundle en tiempo
# de BUILD (no de runtime). Pásalas como build args en Coolify:
#   EXPO_PUBLIC_API_BASE_URL
#   EXPO_PUBLIC_SUPABASE_URL
#   EXPO_PUBLIC_SUPABASE_ANON_KEY
#   EXPO_PUBLIC_MAPBOX_TOKEN           (opcional)
#   EXPO_PUBLIC_EXCHANGE_RATE_API_URL  (opcional)
#   EXPO_PUBLIC_DOLAR_API_URL          (opcional)
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Etapa 1: Dependencias ──────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Instalar dependencias del sistema necesarias para paquetes nativos
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copiar manifiestos de paquetes
COPY package.json package-lock.json* yarn.lock* bun.lockb* ./

# Instalar dependencias (usar npm para mayor compatibilidad en CI/Docker)
# --legacy-peer-deps por incompatibilidades de peer deps en el ecosistema RN
RUN npm ci --legacy-peer-deps

# ─── Etapa 2: Build del bundle web ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Variables de entorno de Expo (se incrustan en el JS bundle en tiempo de build)
ARG EXPO_PUBLIC_API_BASE_URL
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY
ARG EXPO_PUBLIC_MAPBOX_TOKEN
ARG EXPO_PUBLIC_EXCHANGE_RATE_API_URL
ARG EXPO_PUBLIC_DOLAR_API_URL
ARG EXPO_PUBLIC_EAS_PROJECT_ID

ENV EXPO_PUBLIC_API_BASE_URL=$EXPO_PUBLIC_API_BASE_URL
ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL
ENV EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY
ENV EXPO_PUBLIC_MAPBOX_TOKEN=$EXPO_PUBLIC_MAPBOX_TOKEN
ENV EXPO_PUBLIC_EXCHANGE_RATE_API_URL=$EXPO_PUBLIC_EXCHANGE_RATE_API_URL
ENV EXPO_PUBLIC_DOLAR_API_URL=$EXPO_PUBLIC_DOLAR_API_URL
ENV EXPO_PUBLIC_EAS_PROJECT_ID=$EXPO_PUBLIC_EAS_PROJECT_ID

# Desactivar telemetría de Expo en builds de producción
ENV EXPO_NO_TELEMETRY=1
ENV CI=1

# Copiar node_modules de la etapa anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiar todo el código fuente
COPY . .

# Construir la app web estática
# Output → /app/dist
RUN npx expo export --platform web

# Inyectar el registro del Service Worker en el index.html generado
# (Expo no incluye registro de SW automáticamente con Metro web)
RUN sed -i 's|</head>|<script>if("serviceWorker"in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").then(function(r){console.log("[PWA] SW registrado:",r.scope)}).catch(function(e){console.warn("[PWA] SW falló:",e)})})}</script></head>|' /app/dist/index.html

# ─── Etapa 3: Imagen de producción (Nginx) ──────────────────────────────────
FROM nginx:1.27-alpine AS production

# Metadatos de la imagen
LABEL maintainer="Dores App <dores@cruznegradev.com>"
LABEL description="Dores App PWA - Plataforma de delivery"
LABEL version="1.0.0"

# Eliminar la config por defecto de Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar la app compilada desde la etapa builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Ajustar permisos para seguridad
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Puerto que expone la app (Coolify/Traefik maneja SSL externamente)
EXPOSE 80

# Health check para Coolify
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:80/ || exit 1

# Comando de inicio
CMD ["nginx", "-g", "daemon off;"]
