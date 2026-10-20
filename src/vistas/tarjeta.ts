// Tarjetas para kanban y para la lista móvil (<768px). Fotos con <img> seguro:
// loading=lazy, referrerpolicy=no-referrer, width/height fijos; fallback con iniciales
// en --hueso. Nunca innerHTML con datos del portal.
import type { Item } from "../api/tipos";
import { pintaEtapaChip } from "./embudo";

const FORMATEADOR_EUR = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });

function iniciales(titulo: string): string {
  return titulo
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function pintaFoto(item: Item, tamano: number): HTMLElement {
  if (item.fotoUrl) {
    const img = document.createElement("img");
    img.className = "foto";
    img.src = item.fotoUrl;
    img.alt = "";
    img.width = tamano;
    img.height = tamano;
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    img.addEventListener("error", () => {
      img.replaceWith(pintaFotoFallback(item, tamano));
    });
    return img;
  }
  return pintaFotoFallback(item, tamano);
}

function pintaFotoFallback(item: Item, tamano: number): HTMLElement {
  const div = document.createElement("div");
  div.className = "foto";
  div.style.width = `${tamano}px`;
  div.style.height = `${tamano}px`;
  div.textContent = iniciales(item.titulo);
  return div;
}

export function pintaTarjetaLista(item: Item, onAbrirFicha: (id: string) => void): HTMLElement {
  const tarjeta = document.createElement("article");
  tarjeta.className = "tarjeta-item";

  tarjeta.appendChild(pintaFoto(item, 56));

  const cuerpo = document.createElement("div");
  cuerpo.className = "cuerpo";

  const botonTitulo = document.createElement("button");
  botonTitulo.type = "button";
  botonTitulo.className = "titulo-tarjeta";
  botonTitulo.textContent = item.titulo;
  botonTitulo.setAttribute("aria-label", `Abrir ficha de ${item.titulo}`);
  botonTitulo.addEventListener("click", () => onAbrirFicha(item.id));
  cuerpo.appendChild(botonTitulo);

  const meta = document.createElement("span");
  meta.className = "meta-tarjeta";
  meta.textContent = `${item.municipio} · ${item.m2 ?? "—"} m²`;
  cuerpo.appendChild(meta);

  const pie = document.createElement("div");
  pie.className = "pie-tarjeta";
  const precio = document.createElement("span");
  precio.className = "precio-tarjeta tabular-nums";
  precio.textContent = `${FORMATEADOR_EUR.format(item.precio)} €`;
  pie.appendChild(precio);
  pie.appendChild(pintaEtapaChip(item.etapa));
  cuerpo.appendChild(pie);

  tarjeta.appendChild(cuerpo);
  return tarjeta;
}

export function pintaTarjetaKanban(
  item: Item,
  onAbrirFicha: (id: string) => void,
  onPedirMover: (id: string) => void,
): HTMLElement {
  const tarjeta = document.createElement("div");
  tarjeta.className = "kanban-tarjeta";
  tarjeta.dataset.id = item.id;

  const asa = document.createElement("button");
  asa.type = "button";
  asa.className = "asa-arrastre";
  const titulo = document.createElement("span");
  titulo.className = "titulo-kanban";
  titulo.textContent = item.titulo;
  const meta = document.createElement("span");
  meta.className = "meta-kanban";
  meta.textContent = item.m2 ? `${item.municipio} · ${item.m2} m²` : item.municipio;
  const precio = document.createElement("span");
  precio.className = "precio-kanban tabular-nums";
  const precioValor = document.createElement("span");
  precioValor.textContent = `${FORMATEADOR_EUR.format(item.precio)} €`;
  precio.appendChild(precioValor);
  if (item.variacionPct !== null && item.variacionPct < 0) {
    const badge = document.createElement("span");
    badge.className = "badge-bajada";
    badge.textContent = `↓ ${Math.round(item.variacionPct * 100)}%`;
    precio.appendChild(badge);
  } else if (item.m2) {
    const porM2 = document.createElement("span");
    porM2.className = "precio-m2";
    porM2.textContent = `${Math.round(item.precio / item.m2)} €/m²`;
    precio.appendChild(porM2);
  }
  asa.appendChild(titulo);
  asa.appendChild(meta);
  asa.appendChild(precio);
  asa.addEventListener("click", () => onAbrirFicha(item.id));
  tarjeta.appendChild(asa);

  const botonMover = document.createElement("button");
  botonMover.type = "button";
  botonMover.className = "boton-mover-a";
  botonMover.textContent = "Mover a…";
  botonMover.addEventListener("click", (ev) => {
    ev.stopPropagation();
    onPedirMover(item.id);
  });
  tarjeta.appendChild(botonMover);

  return tarjeta;
}
