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

## Host de imágenes de Fotocasa — CONFIRMADO por OT-2

OT-2 reporta: el campo real de la foto en la respuesta de Fotocasa es `multimedia[].src`
(filtrando `type === 'image'`), y el host verificado de esas imágenes es
**`static.fotocasa.es`**.

El comodín `https://*.fotocasa.es` que ya está en la directiva `img-src` del literal del
plan **cubre `static.fotocasa.es` sin ningún cambio** — no se toca la CSP. Se deja anotado
aquí el subdominio concreto verificado por si en el futuro se decide cerrar el comodín a un
host exacto:

```
img-src 'self' data: https://*.tile.openstreetmap.org https://static.fotocasa.es;
```

Mientras no haya esa decisión explícita, la CSP vigente sigue siendo la del literal de
arriba, con el comodín `*.fotocasa.es`.
