import type { Etapa } from "../api/tipos";

export const ETAPAS: Etapa[] = ["novedad", "contactado", "en_espera", "captado", "rechazado"];

const ETIQUETAS: Record<Etapa, string> = {
  novedad: "Novedad",
  contactado: "Contactado",
  en_espera: "En espera",
  captado: "Captado",
  rechazado: "Rechazado",
};

const CLASES: Record<Etapa, string> = {
  novedad: "etapa-novedad",
  contactado: "etapa-contactado",
  en_espera: "etapa-en-espera",
  captado: "etapa-captado",
  rechazado: "etapa-rechazado",
};

export function etiquetaEtapa(etapa: Etapa): string {
  return ETIQUETAS[etapa] ?? etapa;
}

export function pintaEtapaChip(etapa: Etapa): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = `chip-etapa ${CLASES[etapa] ?? ""}`;
  span.textContent = etiquetaEtapa(etapa);
  return span;
}
