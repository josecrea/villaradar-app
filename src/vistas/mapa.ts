// Mapa con Leaflet SOLO bajo demanda (await import), chunk aparte del shell.
// Teselas OSM claras; solo items con lat && lng; honestidad: "N de M con coordenadas".
import { nodoPopup } from "./popup";
import type { Item } from "../api/tipos";
import { API_MOCK } from "../api/base";

export function pintaBotonMapa(contenedor: HTMLElement, items: Item[]): void {
  contenedor.replaceChildren();
  const conCoordenadas = items.filter((i) => i.lat != null && i.lng != null);

  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "boton-abrir-mapa";
  boton.textContent = "Ver mapa";
  boton.addEventListener("click", () => {
    if (document.getElementById("mapa-leaflet")) return; // ya está abierto, evita duplicar el id
    void abrirMapa(contenedor, conCoordenadas);
  });
  contenedor.appendChild(boton);

  const cobertura = document.createElement("p");
  cobertura.className = "mapa-cobertura";
  cobertura.textContent = `${conCoordenadas.length} de ${items.length} con coordenadas`;
  contenedor.appendChild(cobertura);
}

async function abrirMapa(contenedor: HTMLElement, conCoordenadas: Item[]): Promise<void> {
  const mapaDiv = document.createElement("div");
  mapaDiv.id = "mapa-leaflet";
  mapaDiv.className = "mapa-contenedor";
  contenedor.appendChild(mapaDiv);

  if (conCoordenadas.length === 0) return;

  // El CSS base de Leaflet es imprescindible: sin él los panes no son
  // position:absolute y las teselas se desparraman por toda la página.
  await import("leaflet/dist/leaflet.css");
  const [L, iconUrl, iconUrl2x, shadowUrl] = await Promise.all([
    import("leaflet"),
    import("leaflet/dist/images/marker-icon.png"),
    import("leaflet/dist/images/marker-icon-2x.png"),
    import("leaflet/dist/images/marker-shadow.png"),
  ]);
  // Con bundlers, el icono por defecto de Leaflet referencia rutas relativas
  // que no existen tras el build: hay que apuntarlo a los assets importados.
  const iconoPorDefecto = L.icon({
    iconUrl: iconUrl.default,
    iconRetinaUrl: iconUrl2x.default,
    shadowUrl: shadowUrl.default,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  // Sin animaciones de zoom/pan/fade: además de respetar prefers-reduced-motion,
  // hace la carga del mapa determinista para las capturas e2e (GRAVE 3).
  const mapa = L.map(mapaDiv, {
    scrollWheelZoom: false,
    zoomAnimation: false,
    fadeAnimation: false,
    markerZoomAnimation: false,
  }).setView([conCoordenadas[0].lat as number, conCoordenadas[0].lng as number], 11);
  // En el mock (dev/e2e), teselas deterministas servidas por el propio mock
  // (mismo origen, nunca dependen de red externa). En producción, OSM real.
  const urlTeselas = API_MOCK ? "/_t/{z}/{x}/{y}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  L.tileLayer(urlTeselas, {
    attribution: "© OpenStreetMap",
    maxZoom: 18,
  }).addTo(mapa);

  for (const item of conCoordenadas) {
    L.marker([item.lat as number, item.lng as number], { icon: iconoPorDefecto }).addTo(mapa).bindPopup(nodoPopup(item.titulo));
  }
}
