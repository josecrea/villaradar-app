// Franja de mando: 6 cifras del día desde GET /kpis. Verde salvia solo de acento;
// si hay fallos en la cola CRM, aviso discreto (sin rojo de alarma).
import type { Kpis } from "../api/tipos";

export function pintaFranjaMando(contenedor: HTMLElement, datos: Kpis): void {
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
    const aviso = document.createElement("span");
    aviso.className = "aviso-crm";
    aviso.setAttribute("role", "status");
    aviso.textContent = `${datos.crmFallos} fallo${datos.crmFallos === 1 ? "" : "s"} de CRM`;
    franja.appendChild(aviso);
  }

  contenedor.appendChild(franja);
}
