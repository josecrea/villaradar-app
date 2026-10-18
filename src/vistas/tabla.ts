import type { Item, Filtros } from "../api/tipos";
import { pintaEtapaChip } from "./embudo";
import { COLUMNAS_DISPONIBLES, columnasVisibles, guardaColumnasVisibles } from "./columnas";

export interface OpcionesTabla {
  items: Item[];
  filtros: Filtros;
  onOrdenar: (clave: string) => void;
  onFiltrar: (filtros: Filtros) => void;
  onAbrirFicha: (id: string) => void;
  onExportarCsv: () => void;
}

const FORMATEADOR_EUR = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });

function celdaTexto(valor: string): HTMLTableCellElement {
  const td = document.createElement("td");
  td.textContent = valor;
  return td;
}

function celdaPrecio(item: Item): HTMLTableCellElement {
  const td = document.createElement("td");
  td.className = "col-precio tabular-nums";
  const grande = document.createElement("strong");
  grande.textContent = `${FORMATEADOR_EUR.format(item.precio)} €`;
  td.appendChild(grande);
  if (item.m2) {
    const porM2 = document.createElement("span");
    porM2.className = "precio-m2";
    porM2.textContent = ` ${Math.round(item.precio / item.m2)} €/m²`;
    td.appendChild(porM2);
  }
  if (item.variacionPct !== null && item.variacionPct < 0) {
    const badge = document.createElement("span");
    badge.className = "badge-bajada";
    const pct = Math.round(item.variacionPct * 100);
    badge.textContent = `↓ ${pct}%`;
    td.appendChild(badge);
  }
  return td;
}

function celdaEtapa(item: Item): HTMLTableCellElement {
  const td = document.createElement("td");
  td.appendChild(pintaEtapaChip(item.etapa));
  return td;
}

function valorColumna(item: Item, clave: string): HTMLTableCellElement {
  if (clave === "precio") return celdaPrecio(item);
  if (clave === "etapa") return celdaEtapa(item);
  if (clave === "asignadoA") return celdaTexto(item.asignadoA ?? "—");
  const valor = (item as unknown as Record<string, unknown>)[clave];
  if (valor === null || valor === undefined) return celdaTexto("—");
  if (typeof valor === "number") {
    const td = document.createElement("td");
    td.className = "tabular-nums";
    td.textContent = String(valor);
    return td;
  }
  return celdaTexto(String(valor));
}

function pintaCabecera(
  thead: HTMLTableSectionElement,
  columnas: string[],
  ordenActual: string | undefined,
  onOrdenar: (clave: string) => void,
): void {
  const tr = document.createElement("tr");
  for (const clave of columnas) {
    const columna = COLUMNAS_DISPONIBLES.find((c) => c.clave === clave);
    const th = document.createElement("th");
    th.scope = "col";
    const boton = document.createElement("button");
    boton.type = "button";
    boton.textContent = columna?.etiqueta ?? clave;
    boton.addEventListener("click", () => onOrdenar(clave));
    th.appendChild(boton);
    const ordenando = ordenActual === clave || ordenActual === `-${clave}`;
    if (ordenando) {
      th.setAttribute("aria-sort", ordenActual?.startsWith("-") ? "descending" : "ascending");
    } else {
      th.setAttribute("aria-sort", "none");
    }
    tr.appendChild(th);
  }
  thead.appendChild(tr);
}

export function pintaTabla(contenedor: HTMLElement, opciones: OpcionesTabla): void {
  contenedor.replaceChildren();

  const barra = document.createElement("div");
  barra.className = "barra-tabla";

  const chips = document.createElement("div");
  chips.className = "chips-filtro";
  chips.setAttribute("role", "group");
  chips.setAttribute("aria-label", "Filtros activos");
  const filtrosActivos = Object.entries(opciones.filtros).filter(([, v]) => v);
  for (const [clave, valor] of filtrosActivos) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip-filtro";
    chip.textContent = `${clave}: ${valor} ✕`;
    chip.addEventListener("click", () => {
      const nuevos = { ...opciones.filtros };
      delete (nuevos as Record<string, unknown>)[clave];
      opciones.onFiltrar(nuevos);
    });
    chips.appendChild(chip);
  }
  barra.appendChild(chips);

  const botonColumnas = document.createElement("button");
  botonColumnas.type = "button";
  botonColumnas.className = "boton-secundario";
  botonColumnas.textContent = "Columnas";
  botonColumnas.addEventListener("click", () => abrirSelectorColumnas(contenedor, opciones));
  barra.appendChild(botonColumnas);

  const botonCsv = document.createElement("button");
  botonCsv.type = "button";
  botonCsv.className = "boton-secundario";
  botonCsv.textContent = "Exportar CSV";
  botonCsv.addEventListener("click", () => opciones.onExportarCsv());
  barra.appendChild(botonCsv);

  contenedor.appendChild(barra);

  const columnas = columnasVisibles();
  const tabla = document.createElement("table");
  tabla.className = "tabla-densa";
  const thead = document.createElement("thead");
  pintaCabecera(thead, columnas, opciones.filtros.orden, opciones.onOrdenar);
  tabla.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const item of opciones.items) {
    const tr = document.createElement("tr");
    tr.tabIndex = 0;
    tr.className = "fila-item";
    tr.setAttribute("role", "button");
    for (const clave of columnas) tr.appendChild(valorColumna(item, clave));
    const activa = () => opciones.onAbrirFicha(item.id);
    tr.addEventListener("click", activa);
    tr.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        activa();
      }
    });
    tbody.appendChild(tr);
  }
  tabla.appendChild(tbody);
  contenedor.appendChild(tabla);

  if (opciones.items.length === 0) {
    const vacio = document.createElement("p");
    vacio.className = "tabla-vacia";
    vacio.textContent = "Sin resultados para estos filtros.";
    contenedor.appendChild(vacio);
  }
}

function abrirSelectorColumnas(contenedorPadre: HTMLElement, opciones: OpcionesTabla): void {
  const dialogo = document.createElement("dialog");
  dialogo.className = "dialogo-columnas";
  dialogo.setAttribute("aria-label", "Seleccionar columnas visibles");

  const lista = document.createElement("form");
  lista.method = "dialog";
  const actuales = new Set(columnasVisibles());

  for (const columna of COLUMNAS_DISPONIBLES) {
    const etiqueta = document.createElement("label");
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = actuales.has(columna.clave);
    check.value = columna.clave;
    etiqueta.appendChild(check);
    etiqueta.append(` ${columna.etiqueta}`);
    lista.appendChild(etiqueta);
  }

  const botonCerrar = document.createElement("button");
  botonCerrar.type = "submit";
  botonCerrar.textContent = "Aplicar";
  lista.appendChild(botonCerrar);

  dialogo.appendChild(lista);
  document.body.appendChild(dialogo);
  dialogo.showModal();

  const primerCheck = lista.querySelector<HTMLInputElement>("input");
  primerCheck?.focus();

  dialogo.addEventListener("close", () => {
    const seleccionadas = Array.from(lista.querySelectorAll<HTMLInputElement>("input:checked")).map((i) => i.value);
    if (seleccionadas.length > 0) guardaColumnasVisibles(seleccionadas);
    dialogo.remove();
    pintaTabla(contenedorPadre, opciones);
  });
}
