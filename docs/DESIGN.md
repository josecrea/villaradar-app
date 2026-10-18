# Dirección visual — Captación VillaRadar

Swiss/editorial en modo claro: tabla densa como protagonista, cabeceras en
mayúsculas con botón ordenable (`aria-sort`), separación tipográfica entre
el precio (grande, `tabular-nums`) y el €/m² (mudo, gris, tamaño menor). La
bajada de precio se marca con un badge rojo discreto («↓ -6 %»), nunca con
color de fondo en toda la fila. El estado del embudo usa un chip de color
semántico (azul=novedad, ámbar=contactado, gris=en espera, verde=captado,
rojo=rechazado), reutilizando los tokens OKLCH ya existentes en
`villaradar/src/web/render.ts` (--bg, --surf, --g, --amber, --red, --line)
para que la app herede la paleta del panel sin inventar una nueva. Sin
tarjetas, sin sombras decorativas: jerarquía por tipografía y espaciado, no
por adornos. Foco visible con contorno verde (--g) en todos los elementos
interactivos; `prefers-reduced-motion` desactiva las transiciones.
