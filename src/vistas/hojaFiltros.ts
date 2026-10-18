// Hoja inferior de filtros para móvil (<768px). Reutiliza pintaBarraFiltros;
// Esc cierra (nativo del <dialog>) y el foco vuelve al botón que la abrió.
import type { Facetas, Filtros } from "../api/tipos";
import { pintaBarraFiltros } from "./filtros";

export function pintaBotonAbrirFiltros(
  contenedor: HTMLElement,
  opciones: { facetas: Facetas; filtros: Filtros; onAplicar: (f: Filtros) => void },
): void {
  contenedor.replaceChildren();
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "boton-abrir-filtros";
  boton.textContent = "Filtros y orden";
  boton.addEventListener("click", () => abrirHojaFiltros(boton, opciones));
  contenedor.appendChild(boton);
}

function abrirHojaFiltros(
  origen: HTMLElement,
  opciones: { facetas: Facetas; filtros: Filtros; onAplicar: (f: Filtros) => void },
): void {
  const dialogo = document.createElement("dialog");
  dialogo.className = "hoja-filtros";
  dialogo.setAttribute("aria-label", "Filtros y orden");

  const zonaFiltros = document.createElement("div");
  dialogo.appendChild(zonaFiltros);
  pintaBarraFiltros(zonaFiltros, {
    facetas: opciones.facetas,
    filtros: opciones.filtros,
    onAplicar: (nuevos) => {
      dialogo.close();
      opciones.onAplicar(nuevos);
    },
  });

  const cerrar = document.createElement("button");
  cerrar.type = "button";
  cerrar.className = "hoja-filtros-cerrar";
  cerrar.textContent = "Cerrar";
  cerrar.addEventListener("click", () => dialogo.close());
  dialogo.appendChild(cerrar);

  document.body.appendChild(dialogo);
  dialogo.addEventListener("close", () => {
    dialogo.remove();
    origen.focus();
  });
  dialogo.showModal();
}
