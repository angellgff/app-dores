# Despliegue en Coolify — Dores App PWA

## Arquitectura

```
Coolify (Traefik) → Contenedor Docker (Nginx) → App Expo Web (PWA estática)
```

La app se compila en tiempo de **build** como estáticos y se sirve con Nginx.  
Coolify + Traefik gestionan el SSL/HTTPS automáticamente.

---

## Variables de entorno (Build Args)

> ⚠️ Las variables `EXPO_PUBLIC_*` se **incrustan en el bundle JS** durante el build.  
> **No** se pueden cambiar en runtime sin re-hacer el build.

En Coolify, ve a **Build Configuration → Build Args** y añade:

| Variable | Descripción | Obligatoria |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | URL base del backend REST | ✅ |
| `EXPO_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | ✅ |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima de Supabase | ✅ |
| `EXPO_PUBLIC_MAPBOX_TOKEN` | Token público de Mapbox | ⚠️ Recomendado |
| `EXPO_PUBLIC_EXCHANGE_RATE_API_URL` | API de tasa de cambio | ⚠️ Opcional |
| `EXPO_PUBLIC_DOLAR_API_URL` | API de precio del dólar | ⚠️ Opcional |

---

## Pasos en Coolify

### 1. Crear nuevo recurso

1. **New Resource** → **Dockerfile** (o **Git Repository**)
2. Conecta tu repositorio Git
3. Branch: `main`

### 2. Configuración del build

```
Build Method:     Dockerfile
Dockerfile Path:  ./Dockerfile
Port Exposé:      80
```

### 3. Añadir Build Args

En **Environment Variables** elige el tipo **Build (solo durante el build)**:

```env
EXPO_PUBLIC_API_BASE_URL=https://dores.cruznegradev.com/api
EXPO_PUBLIC_SUPABASE_URL=https://yjpcnxhtrucncqdzoyxy.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
EXPO_PUBLIC_MAPBOX_TOKEN=<tu-mapbox-token>
EXPO_PUBLIC_EXCHANGE_RATE_API_URL=https://api.exchangerate.host/latest
EXPO_PUBLIC_DOLAR_API_URL=https://ve.dolarapi.com/v1/dolares
```

### 4. Dominio y SSL

- Añade tu dominio en **Domains**
- Coolify genera el certificado SSL automáticamente con Let's Encrypt
- El contenedor solo escucha en el puerto **80** (Traefik hace el TLS termination)

### 5. Deploy

Haz click en **Deploy** y espera a que termine el build (~3-5 minutos).

---

## Build local (para probar)

```bash
# Build de la imagen
docker build \
  --build-arg EXPO_PUBLIC_API_BASE_URL=https://dores.cruznegradev.com/api \
  --build-arg EXPO_PUBLIC_SUPABASE_URL=https://yjpcnxhtrucncqdzoyxy.supabase.co \
  --build-arg EXPO_PUBLIC_SUPABASE_ANON_KEY=<tu-key> \
  -t dores-app:latest .

# Ejecutar localmente
docker run -p 3000:80 dores-app:latest

# Abrir en el navegador
open http://localhost:3000
```

---

## PWA — Funcionalidades habilitadas

| Feature | Estado |
|---|---|
| Instalable (Add to Home Screen) | ✅ |
| Offline básico (cache app shell) | ✅ |
| Service Worker (sw.js) | ✅ |
| Manifest.json | ✅ (auto-generado por Expo) |
| Íconos PWA | ✅ (desde assets/logo-mobile.png) |
| Push Notifications (web) | 🔜 Requiere configuración adicional |

---

## Health Check

El contenedor incluye un health check en `/`:

```
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3
```

Coolify lo usa para determinar si el deploy fue exitoso.

---

## Actualizar la app

Cada `git push` a `main` puede disparar un nuevo build en Coolify (activar **Auto Deploy** en la configuración del recurso).

```
git push origin main  →  Coolify detecta el push  →  Nuevo build  →  Deploy automático
```
