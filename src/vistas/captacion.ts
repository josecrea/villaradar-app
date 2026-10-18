import { novedades, inmueble, descargaCsv } from "../api/cliente";
import { pintaTabla } from "./tabla";
import { pintaFicha } from "./ficha";
import { leeHash, escribeHash } from "./estadoUrl";
import type { Filtros } from "../api/tipos";

export async function pintaCaptacion(contenedor: HTMLElement): Promise<void> {
  const { ruta, filtros } = leeHash();
  const matchFicha = ruta.match(/^\/inmueble\/(.+)$/);

  if (matchFicha) {
    const id = decodeURIComponent(matchFicha[1]);
    try {
      const ficha = await inmueble(id);
      pintaFicha(contenedor, ficha, () => escribeHash("/captacion", filtros));
    } catch {
      contenedor.textContent = "No se pudo cargar la ficha.";
    }
    return;
  }

  try {
    const resultado = await novedades(filtros);
    pintaTabla(contenedor, {
      items: resultado.items,
      filtros,
      onOrdenar: (clave) => {
        const ordenActual = filtros.orden;
        const descendente = ordenActual === clave;
        escribeHash("/captacion", { ...filtros, orden: descendente ? `-${clave}` : clave });
      },
      onFiltrar: (nuevosFiltros) => escribeHash("/captacion", nuevosFiltros),
      onAbrirFicha: (id) => escribeHash(`/inmueble/${id}`, filtros),
      onExportarCsv: () => descargaCsv(filtros).catch(() => undefined),
    });
  } catch {
    contenedor.textContent = "No se pudo cargar la captación.";
  }
}

export function filtrosDesdeFormulario(formulario: HTMLFormElement): Filtros {
  const datos = new FormData(formulario);
  const filtros: Filtros = {};
  for (const [clave, valor] of datos.entries()) {
    if (typeof valor === "string" && valor) (filtros as Record<string, string>)[clave] = valor;
  }
  return filtros;
}
