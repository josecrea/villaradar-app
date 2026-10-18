// Franja de mando: 6 cifras del día desde GET /kpis. Verde salvia solo de acento;
// si hay fallos en la cola CRM, botón discreto (sin rojo de alarma) que abre
// la lista de pendientes.
import type { Item, Kpis } from "../api/tipos";

export interface OpcionesMando {
  datos: Kpis;
  items: Item[];
  onAbrirFicha: (id: string) => void;
}

export function pintaFranjaMando(contenedor: HTMLElement, opciones: OpcionesMando): void {
  const { datos, items, onAbrirFicha } = opciones;
  contenedor.replaceChildren();
  const franja = document.createElement("section");
  franja.className = "franja-mando";
  franja.setAttribute("aria-label", "Cifras del día");

  const cifra = (etiqueta: string, valor: number, acento = false): HTMLElement => {
    const bloque = document.createElement("div");
    bloque.className = "cifra-mando";
    const valorEl = document.createElement("span");
    valorEl.className = acento ? "valor acento tabular-nums" : "valor tabular-nums";
    valorEl.textContent = String(valor);
    const etiquetaEl = document.createElement("span");
    etiquetaEl.className = "etiqueta";
    etiquetaEl.textContent = etiqueta;
    bloque.appendChild(valorEl);
    bloque.appendChild(etiquetaEl);
    return bloque;
  };

  franja.appendChild(cifra("Nuevos hoy", datos.nuevosHoy, true));
  franja.appendChild(cifra("Con teléfono", datos.conTelefono));
  franja.appendChild(cifra("Bajadas 7 d", datos.bajadas7d));
  franja.appendChild(cifra("Captados", datos.porEtapa.captado ?? 0, true));
  franja.appendChild(cifra("Recordatorios hoy", datos.recordatoriosHoy));
  franja.appendChild(cifra("CRM pendientes", datos.crmPendientes));

  if (datos.crmFallos > 0) {
    const aviso = document.createElement("button");
    aviso.type = "button";
    aviso.className = "aviso-crm";
    aviso.textContent = `${datos.crmFallos} fallo${datos.crmFallos === 1 ? "" : "s"} de CRM`;
    aviso.addEventListener("click", () => abrirListaFallosCrm(items, onAbrirFicha));
    franja.appendChild(aviso);
  }

  contenedor.appendChild(franja);
}

function abrirListaFallosCrm(items: Item[], onAbrirFicha: (id: string) => void): void {
  const fallidos = items.filter((i) => i.crmEstado === "error");

  const dialogo = document.createElement("dialog");
  dialogo.className = "dialogo-mover";
  dialogo.setAttribute("aria-label", "Pendientes con fallo de CRM");

  const lista = document.createElement("ul");
  if (fallidos.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Sin fallos pendientes.";
    lista.appendChild(li);
  }
  for (const item of fallidos) {
    const li = document.createElement("li");
    const boton = document.createElement("button");
    boton.type = "button";
    boton.textContent = item.titulo;
    boton.addEventListener("click", () => {
      dialogo.close();
      onAbrirFicha(item.id);
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
