// Filtros, orden y cursor viven en la URL (hash), no en memoria efímera.
import type { Filtros } from "../api/tipos";

const CLAVES_FILTRO: Array<keyof Filtros> = [
  "q",
  "portal",
  "zona",
  "tipo",
  "operacion",
  "anunciante",
  "precioMin",
  "precioMax",
  "m2min",
  "habmin",
  "banosmin",
  "tel",
  "min",
  "etapa",
  "asignado",
  "orden",
  "cursor",
];

export function leeHash(): { ruta: string; filtros: Filtros } {
  const hash = location.hash.replace(/^#/, "") || "/captacion";
  const [ruta, qs] = hash.split("?");
  const params = new URLSearchParams(qs ?? "");
  const filtros: Filtros = {};
  for (const clave of CLAVES_FILTRO) {
    const valor = params.get(clave);
    if (valor !== null) (filtros as Record<string, string>)[clave] = valor;
  }
  return { ruta: ruta || "/captacion", filtros };
}

export function escribeHash(ruta: string, filtros: Filtros): void {
  const params = new URLSearchParams();
  for (const clave of CLAVES_FILTRO) {
    const valor = filtros[clave];
    if (valor) params.set(clave, valor);
  }
  const qs = params.toString();
  location.hash = qs ? `${ruta}?${qs}` : ruta;
}
