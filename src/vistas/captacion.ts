import { novedades, inmueble, descargaCsv, facetas, kpis } from "../api/cliente";
import { pintaTabla } from "./tabla";
import { pintaKanban } from "./kanban";
import { pintaFranjaMando } from "./mando";
import { abrirDrawerFicha } from "./drawer";
import { pintaBarraFiltros } from "./filtros";
import { pintaBotonAbrirFiltros } from "./hojaFiltros";
import { pintaBotonMapa } from "./mapa";
import { leeHash, escribeHash } from "./estadoUrl";
import { muestraAviso } from "./aviso";

export async function pintaCaptacion(contenedor: HTMLElement): Promise<void> {
  const { filtros } = leeHash();

  contenedor.replaceChildren();
  const zonaMando = document.createElement("div");
  zonaMando.id = "zona-mando";
  const zonaMapa = document.createElement("div");
  zonaMapa.id = "zona-mapa";
  const zonaHojaFiltros = document.createElement("div");
  zonaHojaFiltros.id = "zona-hoja-filtros";
  const zonaFiltros = document.createElement("div");
  zonaFiltros.id = "zona-filtros";
  const zonaKanban = document.createElement("div");
  zonaKanban.id = "zona-kanban";
  const zonaTabla = document.createElement("div");
  zonaTabla.id = "zona-tabla";
  contenedor.appendChild(zonaMando);
  contenedor.appendChild(zonaMapa);
  contenedor.appendChild(zonaHojaFiltros);
  contenedor.appendChild(zonaFiltros);
  contenedor.appendChild(zonaKanban);
  contenedor.appendChild(zonaTabla);

  async function recarga(): Promise<void> {
    try {
      const [resultadoFacetas, resultado, datosKpis] = await Promise.all([
        facetas(),
        novedades(filtros),
        kpis(),
      ]);

      const abrirFicha = (id: string) => {
        inmueble(id)
          .then((ficha) => abrirDrawerFicha(ficha, () => void recarga()))
          .catch(() => muestraAviso("No se pudo abrir la ficha. Inténtalo de nuevo."));
      };

      pintaFranjaMando(zonaMando, { datos: datosKpis, items: resultado.items, onAbrirFicha: abrirFicha });
      pintaBotonMapa(zonaMapa, resultado.items);

      pintaBotonAbrirFiltros(zonaHojaFiltros, {
        facetas: resultadoFacetas,
        filtros,
        onAplicar: (nuevosFiltros) => escribeHash("/captacion", nuevosFiltros),
      });
      pintaBarraFiltros(zonaFiltros, {
        facetas: resultadoFacetas,
        filtros,
        onAplicar: (nuevosFiltros) => escribeHash("/captacion", nuevosFiltros),
      });

      pintaKanban(zonaKanban, {
        items: resultado.items,
        onAbrirFicha: abrirFicha,
        onMovido: () => void recarga(),
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
        onAbrirFicha: abrirFicha,
        onExportarCsv: () => descargaCsv(filtros).catch(() => muestraAviso("No se pudo exportar el CSV. Inténtalo de nuevo.")),
      });
    } catch {
      contenedor.textContent = "No se pudo cargar la captación.";
    }
  }

  await recarga();
}
