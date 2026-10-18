import { novedades, inmueble, descargaCsv, facetas } from "../api/cliente";
import { pintaTabla } from "./tabla";
import { pintaFicha } from "./ficha";
import { pintaBarraFiltros } from "./filtros";
import { leeHash, escribeHash } from "./estadoUrl";

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

  contenedor.replaceChildren();
  const zonaFiltros = document.createElement("div");
  zonaFiltros.id = "zona-filtros";
  const zonaTabla = document.createElement("div");
  zonaTabla.id = "zona-tabla";
  contenedor.appendChild(zonaFiltros);
  contenedor.appendChild(zonaTabla);

  try {
    const [resultadoFacetas, resultado] = await Promise.all([facetas(), novedades(filtros)]);
    pintaBarraFiltros(zonaFiltros, {
      facetas: resultadoFacetas,
      filtros,
      onAplicar: (nuevosFiltros) => escribeHash("/captacion", nuevosFiltros),
    });
    pintaTabla(zonaTabla, {
      items: resultado.items,
      total: resultado.total,
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
