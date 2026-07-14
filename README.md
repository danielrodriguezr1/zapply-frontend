# Zapply Frontend — App de descubrimiento de películas y series

App en **Expo (SDK 56) / React Native** con **Expo Router**. Un mismo código para **Android, iOS y web**. Habla con el backend (repositorio aparte), nunca con TMDB directamente.

---

## Requisitos

- **Node.js LTS** (v20.19.4 o superior)
- El **backend arrancado** (ver su README). Por defecto en `http://localhost:8080`.
- Para probar en un móvil físico: la app **Expo Go** (o un build de desarrollo).

## Puesta en marcha

1. **Instala las dependencias.** El `package.json` solo fija `expo`; el resto se instala con la versión correcta para el SDK 56 usando `expo install`:
   ```bash
   npm install
   npx expo install expo-router expo-constants expo-linking expo-status-bar \
     react-native-safe-area-context react-native-screens \
     react react-native @expo/vector-icons
   ```
   > Usar `npx expo install` (en vez de `npm install <paquete>`) es importante: Expo elige automáticamente las versiones compatibles con tu SDK y evita conflictos.

2. **Configura la URL del backend:**
   ```bash
   cp .env.example .env
   ```
   En emulador o web local, `http://localhost:8080` vale. En un **móvil físico**, cambia `localhost` por la IP de tu ordenador en la red local (p. ej. `http://192.168.1.42:8080`), porque para el móvil "localhost" es él mismo.

3. **Arranca:**
   ```bash
   npx expo start
   ```
   Pulsa `w` para abrir en el navegador, `a` para Android, `i` para iOS, o escanea el QR con Expo Go.

Si todo va bien, la pestaña **Descubrir** mostrará las tendencias reales de TMDB servidas por tu backend. Es la prueba de que el circuito completo (app → backend → TMDB) funciona.

## Estructura

```
app/
├── _layout.tsx           Navegación raíz
└── (tabs)/
    ├── _layout.tsx       La barra de pestañas (Descubrir, Buscar, Watchlist, Perfil)
    ├── index.tsx         Descubrir — de momento muestra "trending" como demo del circuito
    ├── buscar.tsx        (placeholder)
    ├── watchlist.tsx     (placeholder)
    └── perfil.tsx        (placeholder)
lib/
└── api.ts                Llamadas al backend
```

## Qué falta (siguientes fases)

- **Login / onboarding de plataformas** antes de las pestañas.
- **Descubrir real**: panel de filtros (tipo, género, duración, valoración, "En mis plataformas").
- **Ficha de contenido**, **watchlist** y **valoraciones** conectadas a la API.
