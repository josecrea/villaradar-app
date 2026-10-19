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

## `frame-ancestors` en GitHub Pages — inerte por `<meta>`, riesgo aceptado

`frame-ancestors 'none'` protege contra clickjacking, pero la especificación CSP
**ignora `frame-ancestors` cuando se entrega por `<meta http-equiv="Content-Security-Policy">`**
(solo aplica vía cabecera HTTP `Content-Security-Policy`). El navegador lo avisa en
consola: `'frame-ancestors' is ignored when delivered via a <meta> element`.

GitHub Pages sirve ficheros estáticos sin posibilidad de añadir cabeceras HTTP propias
— no hay forma de arreglarlo mientras el front viva ahí. Dos salidas, ninguna aplicada
en esta fase:

1. **Riesgo aceptado** (opción por defecto mientras el front esté en GitHub Pages): la
   app es de solo lectura/gestión interna detrás de login, el impacto de clickjacking
   es bajo, y el resto de la CSP (`script-src 'self'`, `object-src 'none'`,
   `base-uri 'self'`) sigue activo vía `<meta>` sin problema — esas directivas SÍ se
   aplican fuera de cabecera HTTP.
2. Servir el front desde el VPS (ver Plan B de `docs/REVERSION.md` en el repo
   `villaradar`) permite que Traefik o el propio servidor añadan la cabecera HTTP real
   con `frame-ancestors 'none'` efectivo. Solo se activa si Jose lo pide.
