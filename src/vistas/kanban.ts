// Kanban de 5 columnas (≥1200px). Arrastre con Pointer Events, touch-action:none
// SOLO en el asa; dianas ≥44px; SIEMPRE existe el camino sin arrastre ("Mover a…").
// Al soltar (o al elegir en el diálogo) se abre el diálogo de disposiciones.
import type { Item, Etapa } from "../api/tipos";
import { ETAPAS, etiquetaEtapa } from "./embudo";
import { pintaTarjetaKanban } from "./tarjeta";
import { DISPOSICIONES, type Disposicion } from "./disposiciones";
import { cambiaEstado } from "../api/cliente";
import { muestraAviso } from "./aviso";

// Mapa etapa de destino → disposición representativa que la API acepta.
// La etapa real la deriva el backend a partir de la disposición (ver
// embudo.ts del backend); este es el valor que mejor representa cada columna.
const DISPOSICION_POR_ETAPA: Record<Etapa, Disposicion> = {
  novedad: "pendiente",
  contactado: "rellamar",
  en_espera: "buzon",
  captado: "interesado",
  rechazado: "no_interesado",
};

export interface OpcionesKanban {
  items: Item[];
  onAbrirFicha: (id: string) => void;
  onMovido: () => void;
}

function abrirDialogoMover(id: string, tituloItem: string, onMovido: () => void): void {
  const dialogo = document.createElement("dialog");
  dialogo.className = "dialogo-mover";
  dialogo.setAttribute("aria-label", `Mover ${tituloItem} a…`);

  const lista = document.createElement("ul");
  for (const etapa of ETAPAS) {
    const li = document.createElement("li");
    const boton = document.createElement("button");
    boton.type = "button";
    boton.textContent = etiquetaEtapa(etapa);
    boton.addEventListener("click", () => {
      const disposicion = DISPOSICION_POR_ETAPA[etapa];
      const necesitaFecha = DISPOSICIONES.find((d) => d.valor === disposicion)?.necesitaRecordatorio;
      const recordatorioAt = necesitaFecha ? new Date(Date.now() + 86400000).toISOString() : undefined;
      cambiaEstado(id, disposicion, undefined, recordatorioAt)
        .then(() => {
          dialogo.close();
          onMovido();
        })
        .catch(() => {
          dialogo.close();
          muestraAviso(`No se pudo mover «${tituloItem}». Inténtalo de nuevo.`);
        });
    });
    li.appendChild(boton);
    lista.appendChild(li);
  }
  dialogo.appendChild(lista);
  document.body.appendChild(dialogo);
  dialogo.showModal();
  dialogo.querySelector("button")?.focus();

  dialogo.addEventListener("close", () => dialogo.remove());
}

export function pintaKanban(contenedor: HTMLElement, opciones: OpcionesKanban): void {
  contenedor.replaceChildren();

  const kanban = document.createElement("div");
  kanban.className = "kanban";
  kanban.setAttribute("role", "group");
  kanban.setAttribute("aria-label", "Tablero de captación por etapa");

  const columnasPorEtapa = new Map<Etapa, HTMLElement>();

  for (const etapa of ETAPAS) {
    const columna = document.createElement("div");
    columna.className = "kanban-columna";
    columna.dataset.etapa = etapa;
    const items = opciones.items.filter((i) => i.etapa === etapa);
    const h2 = document.createElement("h2");
    h2.textContent = etiquetaEtapa(etapa);
    const contador = document.createElement("span");
    contador.className = "tabular-nums";
    contador.textContent = String(items.length);
    h2.appendChild(contador);
    columna.appendChild(h2);

    for (const item of items) {
      const tarjeta = pintaTarjetaKanban(
        item,
        opciones.onAbrirFicha,
        (id) => abrirDialogoMover(id, item.titulo, opciones.onMovido),
      );
      columna.appendChild(tarjeta);
    }

    columnasPorEtapa.set(etapa, columna);
    kanban.appendChild(columna);
  }

  contenedor.appendChild(kanban);

  configuraArrastre(kanban, opciones.items, opciones.onMovido);
}

// Arrastre real con Pointer Events (sin librería). El asa ya tiene
// touch-action:none; el resto de la tarjeta sigue permitiendo scroll táctil.
function configuraArrastre(kanban: HTMLElement, items: Item[], onMovido: () => void): void {
  let origenId: string | null = null;
  let origenTarjeta: HTMLElement | null = null;

  kanban.addEventListener("pointerdown", (ev) => {
    const asa = (ev.target as HTMLElement).closest(".asa-arrastre");
    if (!asa) return;
    const tarjeta = asa.closest<HTMLElement>(".kanban-tarjeta");
    if (!tarjeta) return;
    origenId = tarjeta.dataset.id ?? null;
    origenTarjeta = tarjeta;
  });

  kanban.addEventListener("pointerup", (ev) => {
    if (!origenId || !origenTarjeta) return;
    const diana = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>(".kanban-columna");
    kanban.querySelectorAll(".diana-activa").forEach((c) => c.classList.remove("diana-activa"));
    if (diana && diana.dataset.etapa) {
      const item = items.find((i) => i.id === origenId);
      if (item && item.etapa !== diana.dataset.etapa) {
        const nuevaEtapa = diana.dataset.etapa as Etapa;
        const disposicion = DISPOSICION_POR_ETAPA[nuevaEtapa];
        const necesitaFecha = DISPOSICIONES.find((d) => d.valor === disposicion)?.necesitaRecordatorio;
        const recordatorioAt = necesitaFecha ? new Date(Date.now() + 86400000).toISOString() : undefined;
        const tituloItem = item.titulo;
        cambiaEstado(origenId, disposicion, undefined, recordatorioAt)
          .then(onMovido)
          .catch(() => {
            // La recarga normal del tablero (tras onMovido/éxito) ya refleja
            // el estado real; si falla, no se llama a onMovido y la tarjeta
            // se queda donde estaba (nunca se movió de verdad en el DOM) —
            // pero el usuario debe saber que el arrastre NO se aplicó.
            muestraAviso(`No se pudo mover «${tituloItem}». Inténtalo de nuevo.`);
          });
      }
    }
    origenId = null;
    origenTarjeta = null;
  });

  kanban.addEventListener("pointermove", (ev) => {
    if (!origenId) return;
    kanban.querySelectorAll(".diana-activa").forEach((c) => c.classList.remove("diana-activa"));
    const diana = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>(".kanban-columna");
    diana?.classList.add("diana-activa");
  });
}
