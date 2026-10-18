// Barra de filtros real (§6): alimentada por GET /facetas, escribe en la URL.
import type { Facetas, Filtros } from "../api/tipos";

export interface OpcionesFiltros {
  facetas: Facetas;
  filtros: Filtros;
  onAplicar: (filtros: Filtros) => void;
}

function opcionesSelect(select: HTMLSelectElement, etiquetaVacia: string, valores: string[], actual?: string): void {
  const vacia = document.createElement("option");
  vacia.value = "";
  vacia.textContent = etiquetaVacia;
  select.appendChild(vacia);
  for (const valor of valores) {
    const opcion = document.createElement("option");
    opcion.value = valor;
    opcion.textContent = valor;
    opcion.selected = valor === actual;
    select.appendChild(opcion);
  }
}

const ETAPAS_FILTRO = ["novedad", "contactado", "en_espera", "captado", "rechazado"];
const ORDEN_OPCIONES: Array<[string, string]> = [
  ["", "Relevancia"],
  ["precio", "Precio ↑"],
  ["-precio", "Precio ↓"],
  ["score", "Score ↑"],
  ["-score", "Score ↓"],
];

export function pintaBarraFiltros(contenedor: HTMLElement, opciones: OpcionesFiltros): void {
  contenedor.replaceChildren();

  const formulario = document.createElement("form");
  formulario.className = "barra-filtros";
  formulario.setAttribute("aria-label", "Filtros de captación");
  formulario.noValidate = true;

  const campo = (etiqueta: string, nodo: HTMLElement): HTMLElement => {
    const envoltorio = document.createElement("label");
    envoltorio.className = "campo-filtro";
    const span = document.createElement("span");
    span.textContent = etiqueta;
    envoltorio.appendChild(span);
    envoltorio.appendChild(nodo);
    return envoltorio;
  };

  const selZona = document.createElement("select");
  selZona.name = "zona";
  opcionesSelect(selZona, "Zona (todas)", opciones.facetas.zonas, opciones.filtros.zona);
  formulario.appendChild(campo("Zona", selZona));

  const selTipo = document.createElement("select");
  selTipo.name = "tipo";
  opcionesSelect(selTipo, "Tipo (todos)", opciones.facetas.tipos, opciones.filtros.tipo);
  formulario.appendChild(campo("Tipo", selTipo));

  const selPortal = document.createElement("select");
  selPortal.name = "portal";
  opcionesSelect(selPortal, "Portal (todos)", opciones.facetas.portales, opciones.filtros.portal);
  formulario.appendChild(campo("Portal", selPortal));

  const selAnunciante = document.createElement("select");
  selAnunciante.name = "anunciante";
  opcionesSelect(selAnunciante, "Anunciante (todos)", opciones.facetas.anunciantes, opciones.filtros.anunciante);
  formulario.appendChild(campo("Anunciante", selAnunciante));

  const selEtapa = document.createElement("select");
  selEtapa.name = "etapa";
  opcionesSelect(selEtapa, "Etapa (todas)", ETAPAS_FILTRO, opciones.filtros.etapa);
  formulario.appendChild(campo("Etapa", selEtapa));

  const checkTel = document.createElement("input");
  checkTel.type = "checkbox";
  checkTel.name = "tel";
  checkTel.checked = opciones.filtros.tel === "1";
  formulario.appendChild(campo("Con teléfono", checkTel));

  const inpPrecioMin = document.createElement("input");
  inpPrecioMin.type = "number";
  inpPrecioMin.name = "precioMin";
  inpPrecioMin.min = "0";
  inpPrecioMin.value = opciones.filtros.precioMin ?? "";
  formulario.appendChild(campo("Precio mín.", inpPrecioMin));

  const inpPrecioMax = document.createElement("input");
  inpPrecioMax.type = "number";
  inpPrecioMax.name = "precioMax";
  inpPrecioMax.min = "0";
  inpPrecioMax.value = opciones.filtros.precioMax ?? "";
  formulario.appendChild(campo("Precio máx.", inpPrecioMax));

  const inpM2Min = document.createElement("input");
  inpM2Min.type = "number";
  inpM2Min.name = "m2min";
  inpM2Min.min = "0";
  inpM2Min.value = opciones.filtros.m2min ?? "";
  formulario.appendChild(campo("m² mín.", inpM2Min));

  const inpScoreMin = document.createElement("input");
  inpScoreMin.type = "number";
  inpScoreMin.name = "min";
  inpScoreMin.min = "0";
  inpScoreMin.max = "100";
  inpScoreMin.value = opciones.filtros.min ?? "";
  formulario.appendChild(campo("Score mín.", inpScoreMin));

  const selOrden = document.createElement("select");
  selOrden.name = "orden";
  for (const [valor, etiqueta] of ORDEN_OPCIONES) {
    const opcion = document.createElement("option");
    opcion.value = valor;
    opcion.textContent = etiqueta;
    opcion.selected = valor === (opciones.filtros.orden ?? "");
    selOrden.appendChild(opcion);
  }
  formulario.appendChild(campo("Orden", selOrden));

  const botonAplicar = document.createElement("button");
  botonAplicar.type = "submit";
  botonAplicar.textContent = "Aplicar filtros";
  formulario.appendChild(botonAplicar);

  formulario.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const datos = new FormData(formulario);
    const nuevos: Filtros = {};
    for (const [clave, valor] of datos.entries()) {
      if (typeof valor === "string" && valor) (nuevos as Record<string, string>)[clave] = valor;
    }
    if (checkTel.checked) (nuevos as Record<string, string>).tel = "1";
    opciones.onAplicar(nuevos);
  });

  contenedor.appendChild(formulario);
}
