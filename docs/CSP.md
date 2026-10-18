# CSP — VillaRadar app (literal del plan, OT-4 devops)

Esta es la CSP **literal** acordada en el plan [atelier:villaradar-app-v11]. OT-3 (frontend)
debe pegarla sin negociar en `index.html` (meta `http-equiv="Content-Security-Policy"`) y en
cualquier cabecera HTTP equivalente que sirva el host de producción.

```
default-src 'self'; script-src 'self'; connect-src 'self' https://villaradar.zohmip.easypanel.host; img-src 'self' data: https://*.tile.openstreetmap.org https://*.fotocasa.es; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'
```

## Por qué `style-src 'self' 'unsafe-inline'` NO es cosmético

Medido en modo dev el 18-oct-2026: con una CSP sin `'unsafe-inline'` en `style-src`,
`document.styleSheets.length === 0` — la app carga **sin ningún estilo aplicado**. Vite en
desarrollo (y algunos patrones de CSS-in-JS/estilos inyectados por librerías de terceros,
p. ej. Leaflet) inyectan `<style>` inline o atributos `style=""` que una CSP estricta sin
`'unsafe-inline'` bloquea silenciosamente — no hay error visible en consola de red, solo una
página sin estilos. Por eso esta directiva se queda tal cual está en el literal del plan,
aunque reduce el blindaje teórico contra CSS-injection: el coste de quitarla es mayor que el
riesgo que mitiga para esta app.

## Teselas de OpenStreetMap

`img-src` incluye `https://*.tile.openstreetmap.org` porque `mapa.ts` (OT-3) carga Leaflet
con teselas OSM públicas al abrir la ficha de un inmueble (`await import("leaflet")`, chunk
aparte — ver `scripts/check-tamano.mjs`).

## Host de imágenes de Fotocasa — PENDIENTE DE CONFIRMAR

`img-src` incluye `https://*.fotocasa.es` como placeholder del plan. **OT-2 (captador) debe
reportar el host REAL** de las imágenes que entrega el campo `fotoUrl` del contrato v1.1
(dominio exacto, p. ej. `st3.depositphotos.com`, `img.fotocasa.es`, un CDN de terceros, etc.).

- Si el host real coincide con `*.fotocasa.es` → no hay cambio.
- Si es distinto → **se añade SOLO aquí** (este fichero), nunca se negocia el resto de la
  CSP, y se avisa a OT-3 para que actualice `index.html` con el valor corregido.

Estado a 19-oct-2026: **a la espera del reporte de OT-2** sobre el host definitivo de
`fotoUrl`. Hasta que llegue, el placeholder `https://*.fotocasa.es` queda documentado como
provisional.
