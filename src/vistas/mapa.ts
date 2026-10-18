// Mapa con Leaflet SOLO bajo demanda (await import), chunk aparte del shell.
// Teselas OSM claras; solo items con lat && lng; honestidad: "N de M con coordenadas".
import type { Item } from "../api/tipos";

export function pintaBotonMapa(contenedor: HTMLElement, items: Item[]): void {
  contenedor.replaceChildren();
  const conCoordenadas = items.filter((i) => i.lat != null && i.lng != null);

  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "boton-abrir-mapa";
  boton.textContent = "Ver mapa";
  boton.addEventListener("click", () => abrirMapa(contenedor, conCoordenadas));
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

  const L = await import("leaflet");
  const mapa = L.map(mapaDiv, { scrollWheelZoom: false }).setView(
    [conCoordenadas[0].lat as number, conCoordenadas[0].lng as number],
    11,
  );
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
    maxZoom: 18,
  }).addTo(mapa);

  for (const item of conCoordenadas) {
    L.marker([item.lat as number, item.lng as number]).addTo(mapa).bindPopup(item.titulo);
  }
}
