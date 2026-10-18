// Selección de columnas visibles, persistida en localStorage (vr.columnas).
export interface Columna {
  clave: string;
  etiqueta: string;
}

export const COLUMNAS_DISPONIBLES: Columna[] = [
  { clave: "titulo", etiqueta: "Título" },
  { clave: "municipio", etiqueta: "Municipio" },
  { clave: "precio", etiqueta: "Precio" },
  { clave: "m2", etiqueta: "m²" },
  { clave: "hab", etiqueta: "Hab." },
  { clave: "banos", etiqueta: "Baños" },
  { clave: "portal", etiqueta: "Portal" },
  { clave: "anunciante", etiqueta: "Anunciante" },
  { clave: "score", etiqueta: "Score" },
  { clave: "etapa", etiqueta: "Etapa" },
  { clave: "asignadoA", etiqueta: "Asignado" },
];

const CLAVE_STORAGE = "vr.columnas";
const DEFECTO = ["titulo", "municipio", "precio", "m2", "portal", "score", "etapa"];

export function columnasVisibles(): string[] {
  const crudo = localStorage.getItem(CLAVE_STORAGE);
  if (!crudo) return DEFECTO;
  try {
    const lista = JSON.parse(crudo);
    if (Array.isArray(lista) && lista.every((x) => typeof x === "string")) return lista;
  } catch {
    /* ignora valor corrupto, usa defecto */
  }
  return DEFECTO;
}

export function guardaColumnasVisibles(claves: string[]): void {
  localStorage.setItem(CLAVE_STORAGE, JSON.stringify(claves));
}
