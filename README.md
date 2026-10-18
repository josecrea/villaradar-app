# villaradar-app

Front público de Captación de VillaRadar (Vite + TypeScript vanilla, sin
framework). Se publica en GitHub Pages bajo `/villaradar-app/` y habla con
la API en `https://villaradar.zohmip.easypanel.host/api/v1`.

## Desarrollo

```bash
npm install
npm run mock     # servidor mock de /api/v1 en :8787
VITE_API_MOCK=1 npm run dev
```

## Scripts

- `npm run build` — build de producción + genera `dist/404.html`.
- `npm run dev` — servidor de desarrollo.
- `npm run mock` — servidor mock de la API v1 sobre fixtures sintéticas.
- `npm run check:size` — presupuesto de JS gzip (< 80 kB).
- `npm run check:fugas` — escaneo de fugas (teléfonos reales, secretos, la
  palabra prohibida del criterio 2x1); el script lo aporta la OT de devops.
- `npm run test:e2e` — Playwright (capturas 320/768/1440, accesibilidad,
  teclado, persistencia de estado en la URL).

## Datos

Los fixtures de `mock/fixtures/*.json` son sintéticos: municipios reales
del sur de Tenerife, pero direcciones, teléfonos (+34 900 000 000) y
anuncios inventados. Nunca se usan datos reales de listings ni de
contactos en este repositorio público.
