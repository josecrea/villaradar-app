// Vista #/valoracion: formulario, vista previa del cálculo y descarga del PDF.
// Solo createElement y textContent (nada de HTML en cadena).
import { valora, descargaPdfValoracion, inmueble, facetas, ErrorApi } from "../api/cliente";
import { IDIOMAS } from "../api/tipos";
import type { EntradaValoracion, Idioma, TipoInmueble, ValoracionRespuesta, Testigo } from "../api/tipos";

const NOMBRE_IDIOMA: Record<Idioma, string> = {
  es: "Español",
  en: "English",
  it: "Italiano",
  de: "Deutsch",
  fr: "Français",
  nl: "Nederlands",
};

const TIPOS: Array<[TipoInmueble, string]> = [
  ["piso", "Piso"],
  ["atico", "Ático"],
  ["duplex", "Dúplex"],
  ["estudio", "Estudio"],
  ["casa", "Casa"],
  ["chalet", "Chalet"],
];

const ESTADOS: Array<[EntradaValoracion["estado"], string]> = [
  ["segunda_mano", "Segunda mano"],
  ["obra_nueva", "Obra nueva"],
];

const MAX_OBSERVACIONES = 1200;
const RE_CP = /^38\d{3}$/;
const RE_REF_CATASTRAL = /^[0-9A-Z]{14}([0-9A-Z]{4}([0-9A-Z]{2})?)?$/;

type Clave = keyof EntradaValoracion;
type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

// "always": en es-ES, 4 cifras no llevan punto por defecto (3149); así todo sale con miles (3.149).
// El lib de TS 5.7 solo tipa boolean; los navegadores actuales aceptan "always".
const numero = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 0,
  useGrouping: "always" as unknown as boolean,
});
const decimal = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });
const fmtEuro = (n: number): string => `${numero.format(n)} €`;

// --- utilidades de DOM -------------------------------------------------------

function el<K extends keyof HTMLElementTagNameMap>(
  etiqueta: K,
  clase?: string,
  texto?: string,
): HTMLElementTagNameMap[K] {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

function opciones<T extends string>(select: HTMLSelectElement, lista: Array<[T, string]>): void {
  for (const [valor, etiqueta] of lista) {
    const o = el("option", undefined, etiqueta);
    o.value = valor;
    select.appendChild(o);
  }
}

// --- validación (mismas reglas que el zod de la API) ------------------------

function enteroEnRango(texto: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(texto)) return null;
  const n = Number(texto);
  return n >= min && n <= max ? n : null;
}

type Resultado = { entrada: EntradaValoracion; errores: never[] } | { entrada: null; errores: Array<[Clave, string]> };

function leeEntrada(c: Record<Clave, Control>, listingId: string | null): Resultado {
  const errores: Array<[Clave, string]> = [];
  const v = (k: Clave): string => c[k].value.trim();

  const direccion = v("direccion");
  if (direccion.length < 3 || direccion.length > 200) errores.push(["direccion", "Indica la dirección (3 a 200 caracteres)."]);
  const cp = v("cp");
  if (!RE_CP.test(cp)) errores.push(["cp", "El código postal debe ser 38 seguido de tres cifras."]);
  const municipio = v("municipio");
  if (municipio.length < 2 || municipio.length > 80) errores.push(["municipio", "Indica el municipio."]);
  const zona = v("zona");
  if (zona.length > 80) errores.push(["zona", "La zona admite 80 caracteres como máximo."]);
  const m2 = enteroEnRango(v("m2Declarados"), 10, 10000);
  if (m2 === null) errores.push(["m2Declarados", "Superficie: número entero entre 10 y 10000."]);
  const hab = enteroEnRango(v("habitaciones"), 0, 20);
  if (hab === null) errores.push(["habitaciones", "Habitaciones: número entero entre 0 y 20."]);
  const banos = enteroEnRango(v("banos"), 0, 10);
  if (banos === null) errores.push(["banos", "Baños: número entero entre 0 y 10."]);

  const ref = v("refCatastral").toUpperCase();
  if (ref && !RE_REF_CATASTRAL.test(ref)) {
    errores.push(["refCatastral", "Referencia catastral de 14, 18 o 20 caracteres (cifras y letras)."]);
  }
  const precioTexto = v("precioPropietario");
  const precio = precioTexto ? enteroEnRango(precioTexto, 1, 100_000_000) : null;
  if (precioTexto && precio === null) errores.push(["precioPropietario", "Precio: número entero en euros."]);
  const obs = c.observaciones.value.trim();
  if (obs.length > MAX_OBSERVACIONES) {
    errores.push(["observaciones", `Observaciones: ${MAX_OBSERVACIONES} caracteres como máximo.`]);
  }

  if (errores.length > 0 || m2 === null || hab === null || banos === null) {
    return { entrada: null, errores };
  }
  // Lista blanca explícita: la API rechaza claves desconocidas.
  const entrada: EntradaValoracion = {
    idioma: c.idioma.value as Idioma,
    direccion,
    cp,
    municipio,
    tipo: c.tipo.value as TipoInmueble,
    estado: c.estado.value as EntradaValoracion["estado"],
    m2Declarados: m2,
    habitaciones: hab,
    banos,
  };
  if (zona) entrada.zona = zona;
  if (ref) entrada.refCatastral = ref;
  if (precio !== null) entrada.precioPropietario = precio;
  if (obs) entrada.observaciones = obs;
  if (listingId) entrada.listingId = listingId;
  return { entrada, errores: [] };
}

// --- vista previa -----------------------------------------------------------

function fila(dl: HTMLElement, etiqueta: string, valor: string): void {
  dl.appendChild(el("dt", undefined, etiqueta));
  dl.appendChild(el("dd", "tabular-nums", valor));
}

function bloque(titulo: string, id: string): { seccion: HTMLElement; dl: HTMLElement } {
  const seccion = el("section", "valoracion-bloque");
  seccion.setAttribute("aria-labelledby", id);
  const h = el("h3", undefined, titulo);
  h.id = id;
  seccion.appendChild(h);
  const dl = el("dl", "valoracion-datos");
  seccion.appendChild(dl);
  return { seccion, dl };
}

function bloqueSuperficie(r: ValoracionRespuesta): HTMLElement {
  const { seccion, dl } = bloque("Superficie", "vp-superficie");
  const s = r.superficie;
  fila(dl, "Declarada", `${numero.format(s.m2Declarados)} m²`);
  fila(dl, "Catastro", s.m2Catastro === null ? "Sin dato" : `${numero.format(s.m2Catastro)} m²`);
  if (s.desviacionPct !== null) fila(dl, "Desviación", `${decimal.format(s.desviacionPct)} %`);
  fila(dl, "Base de cálculo", `${numero.format(s.m2Base)} m² (${s.origenBase === "catastro" ? "Catastro" : "declarada"})`);
  return seccion;
}

function bloqueEscriturado(r: ValoracionRespuesta): HTMLElement {
  const { seccion, dl } = bloque("Precios escriturados", "vp-escriturado");
  const e = r.escriturado;
  if (!e) {
    dl.appendChild(el("dt", undefined, "Escriturado"));
    dl.appendChild(el("dd", undefined, "Sin datos para este código postal"));
    return seccion;
  }
  fila(dl, "€/m²", fmtEuro(e.eurM2));
  fila(dl, "Valor", fmtEuro(e.valor));
  fila(dl, "Fuente", e.fuente === "arcgis" ? "Consulta en línea" : "Copia local");
  fila(dl, "Fecha", e.fecha);
  if (e.compraventas !== null) fila(dl, "Compraventas", numero.format(e.compraventas));
  return seccion;
}

function bloqueAnuncios(r: ValoracionRespuesta): HTMLElement {
  const { seccion, dl } = bloque("Anuncios comparables", "vp-anuncios");
  fila(dl, "Anuncios", numero.format(r.anuncios.n));
  if (r.anuncios.eurM2) fila(dl, "€/m² (p25 · p50 · p75)", [r.anuncios.eurM2.p25, r.anuncios.eurM2.p50, r.anuncios.eurM2.p75].map(numero.format).join(" · "));
  if (r.anuncios.valor) fila(dl, "Valor (p25 · p50 · p75)", [r.anuncios.valor.p25, r.anuncios.valor.p50, r.anuncios.valor.p75].map(fmtEuro).join(" · "));
  fila(dl, "Criterios relajados", r.anuncios.relajado.length > 0 ? r.anuncios.relajado.join(", ") : "Ninguno");
  return seccion;
}

function bloquePropuesta(r: ValoracionRespuesta): HTMLElement {
  const { seccion, dl } = bloque("Propuesta de precio", "vp-propuesta");
  const p = r.propuesta;
  if (p.abstencion || p.salida === null) {
    seccion.appendChild(el("p", "valoracion-sin-cifra", "Sin cifra: no hay evidencia suficiente"));
    return seccion;
  }
  if (p.ventaRapida !== null) fila(dl, "Venta rápida", fmtEuro(p.ventaRapida));
  fila(dl, "Salida recomendada", fmtEuro(p.salida));
  if (p.techo !== null) fila(dl, "Techo", fmtEuro(p.techo));
  return seccion;
}

function celda(fila_: HTMLElement, texto: string, clase?: string): void {
  fila_.appendChild(el("td", clase, texto));
}

function tablaTestigos(testigos: Testigo[]): HTMLElement {
  const seccion = el("section", "valoracion-bloque");
  seccion.setAttribute("aria-labelledby", "vp-testigos");
  const h = el("h3", undefined, "Testigos");
  h.id = "vp-testigos";
  seccion.appendChild(h);
  const marco = el("div", "tabla-desplazable");
  marco.tabIndex = 0;
  marco.setAttribute("role", "region");
  marco.setAttribute("aria-label", "Tabla de testigos");
  const tabla = el("table", "tabla-testigos");
  const cab = el("tr");
  for (const t of ["m²", "Hab.", "Baños", "Precio", "€/m²", "Zona", "Portal"]) {
    const th = el("th", undefined, t);
    th.scope = "col";
    cab.appendChild(th);
  }
  tabla.appendChild(el("thead")).appendChild(cab);
  const cuerpo = el("tbody");
  for (const t of testigos) {
    const tr = el("tr");
    celda(tr, numero.format(t.m2), "tabular-nums");
    celda(tr, t.hab === null ? "–" : String(t.hab), "tabular-nums");
    celda(tr, t.banos === null ? "–" : String(t.banos), "tabular-nums");
    celda(tr, fmtEuro(t.precio), "tabular-nums");
    celda(tr, numero.format(t.eurM2), "tabular-nums");
    celda(tr, t.zona);
    celda(tr, t.portal);
    cuerpo.appendChild(tr);
  }
  tabla.appendChild(cuerpo);
  marco.appendChild(tabla);
  seccion.appendChild(marco);
  return seccion;
}

function pintaPrevia(destino: HTMLElement, r: ValoracionRespuesta, alDescargar: (b: HTMLButtonElement) => void): void {
  destino.replaceChildren();
  const titulo = el("h2", undefined, "Vista previa");
  titulo.tabIndex = -1;
  destino.appendChild(titulo);
  destino.appendChild(bloquePropuesta(r));
  destino.appendChild(bloqueSuperficie(r));
  destino.appendChild(bloqueEscriturado(r));
  destino.appendChild(bloqueAnuncios(r));
  if (r.avisos.length > 0) {
    const lista = el("ul", "valoracion-avisos");
    lista.setAttribute("aria-label", "Avisos");
    for (const a of r.avisos) lista.appendChild(el("li", undefined, a.texto));
    destino.appendChild(lista);
  }
  if (r.testigos.length > 0) destino.appendChild(tablaTestigos(r.testigos));
  const pdf = el("button", "boton-principal", "Descargar PDF");
  pdf.type = "button";
  pdf.addEventListener("click", () => alDescargar(pdf));
  destino.appendChild(pdf);
  titulo.focus();
}

// --- formulario -------------------------------------------------------------

interface Campos {
  controles: Record<Clave, Control>;
  errores: Record<Clave, HTMLElement>;
  formulario: HTMLFormElement;
  datalist: HTMLDataListElement;
}

function creaFormulario(): Campos {
  const formulario = el("form", "form-valoracion");
  formulario.noValidate = true;
  const controles = {} as Record<Clave, Control>;
  const errores = {} as Record<Clave, HTMLElement>;

  const campo = (clave: Clave, etiqueta: string, control: Control, ayuda?: string, ancho = false): void => {
    const caja = el("div", ancho ? "campo campo-ancho" : "campo");
    control.id = `vf-${clave}`;
    control.name = clave;
    const label = el("label", undefined, etiqueta);
    label.htmlFor = control.id;
    const error = el("p", "campo-error");
    error.id = `vf-${clave}-error`;
    error.hidden = true;
    caja.appendChild(label);
    caja.appendChild(control);
    if (ayuda) {
      const p = el("p", "campo-ayuda", ayuda);
      p.id = `vf-${clave}-ayuda`;
      control.setAttribute("aria-describedby", p.id);
      caja.appendChild(p);
    }
    caja.appendChild(error);
    formulario.appendChild(caja);
    controles[clave] = control;
    errores[clave] = error;
  };

  const texto = (tipo: "text" | "number" = "text"): HTMLInputElement => {
    const i = el("input");
    i.type = tipo;
    return i;
  };
  const entero = (): HTMLInputElement => {
    const i = texto();
    i.inputMode = "numeric";
    i.autocomplete = "off";
    return i;
  };

  const idioma = el("select");
  opciones(idioma, IDIOMAS.map((c): [Idioma, string] => [c, NOMBRE_IDIOMA[c]]));
  campo("idioma", "Idioma del informe", idioma);

  campo("direccion", "Dirección", texto(), undefined, true);

  const cp = entero();
  cp.setAttribute("pattern", "38\\d{3}");
  cp.maxLength = 5;
  campo("cp", "Código postal", cp);

  const municipio = texto();
  const datalist = el("datalist");
  datalist.id = "vf-municipios";
  municipio.setAttribute("list", datalist.id);
  campo("municipio", "Municipio", municipio);
  formulario.appendChild(datalist);

  campo("zona", "Zona (opcional)", texto());

  const tipo = el("select");
  opciones(tipo, TIPOS);
  campo("tipo", "Tipo de inmueble", tipo);

  const estado = el("select");
  opciones(estado, ESTADOS);
  campo("estado", "Estado", estado);

  campo("m2Declarados", "Superficie (m²)", entero());
  campo("habitaciones", "Habitaciones", entero());
  campo("banos", "Baños", entero());
  campo("refCatastral", "Referencia catastral (opcional)", texto(), "14, 18 o 20 caracteres.");
  campo("precioPropietario", "Precio del propietario, € (opcional)", entero());

  const obs = el("textarea");
  obs.rows = 4;
  obs.maxLength = MAX_OBSERVACIONES;
  campo("observaciones", "Observaciones (opcional)", obs, undefined, true);

  return { controles, errores, formulario, datalist };
}

function marcaError(c: Campos, clave: Clave, mensaje: string): void {
  const control = c.controles[clave];
  const error = c.errores[clave];
  if (!control || !error) return;
  error.textContent = mensaje;
  error.hidden = false;
  control.setAttribute("aria-invalid", "true");
  const ids = [`vf-${clave}-error`];
  if (document.getElementById(`vf-${clave}-ayuda`)) ids.push(`vf-${clave}-ayuda`);
  control.setAttribute("aria-describedby", ids.join(" "));
}

function limpiaErrores(c: Campos): void {
  for (const clave of Object.keys(c.errores) as Clave[]) {
    const control = c.controles[clave];
    c.errores[clave].hidden = true;
    c.errores[clave].textContent = "";
    control.removeAttribute("aria-invalid");
    if (document.getElementById(`vf-${clave}-ayuda`)) control.setAttribute("aria-describedby", `vf-${clave}-ayuda`);
    else control.removeAttribute("aria-describedby");
  }
}

function listingDeLaUrl(): string | null {
  const qs = location.hash.split("?")[1] ?? "";
  const id = new URLSearchParams(qs).get("listing");
  return id && id.length <= 100 ? id : null;
}

async function precarga(c: Campos, id: string): Promise<void> {
  const ficha = await inmueble(id);
  c.controles.municipio.value = ficha.municipio;
  if (ficha.m2 !== null) c.controles.m2Declarados.value = String(ficha.m2);
  if (ficha.hab !== null) c.controles.habitaciones.value = String(ficha.hab);
  if (ficha.banos !== null) c.controles.banos.value = String(ficha.banos);
  if (TIPOS.some(([valor]) => valor === ficha.tipo)) c.controles.tipo.value = ficha.tipo;
}

export function pintaValoracion(main: HTMLElement): void {
  main.replaceChildren();
  const articulo = el("article", "valoracion");
  articulo.appendChild(el("h1", undefined, "Informe de valoración"));

  const campos = creaFormulario();
  const listingId = listingDeLaUrl();

  const errorGeneral = el("p", "campo-error valoracion-error");
  errorGeneral.setAttribute("role", "alert");
  errorGeneral.hidden = true;
  const calcular = el("button", "boton-principal", "Calcular");
  calcular.type = "submit";
  campos.formulario.appendChild(errorGeneral);
  campos.formulario.appendChild(calcular);
  articulo.appendChild(campos.formulario);

  const previa = el("section", "valoracion-previa");
  previa.setAttribute("aria-live", "polite");
  articulo.appendChild(previa);
  main.appendChild(articulo);

  facetas()
    .then((f) => {
      for (const zona of f.zonas) {
        const o = el("option");
        o.value = zona;
        campos.datalist.appendChild(o);
      }
    })
    .catch(() => undefined); // el datalist es una ayuda: sin él se escribe el municipio a mano

  if (listingId) {
    precarga(campos, listingId).catch(() => {
      errorGeneral.textContent = "No se pudo precargar el inmueble. Rellena los datos a mano.";
      errorGeneral.hidden = false;
    });
  }

  let ultima: EntradaValoracion | null = null;

  const mensajeApi = (e: unknown): string =>
    e instanceof ErrorApi && e.status === 400
      ? "Revisa los campos marcados."
      : "No se pudo completar la operación. Inténtalo de nuevo.";

  const marcaCamposApi = (e: unknown): void => {
    if (!(e instanceof ErrorApi) || !e.campos) return;
    for (const campo of e.campos) {
      if (campo in campos.controles) marcaError(campos, campo as Clave, "Valor no válido.");
    }
  };

  campos.formulario.addEventListener("submit", (ev) => {
    ev.preventDefault();
    limpiaErrores(campos);
    errorGeneral.hidden = true;
    const r = leeEntrada(campos.controles, listingId);
    if (r.entrada === null) {
      for (const [clave, mensaje] of r.errores) marcaError(campos, clave, mensaje);
      const primero = r.errores[0];
      if (primero) campos.controles[primero[0]].focus();
      return;
    }
    const entrada = r.entrada;
    calcular.disabled = true;
    valora(entrada)
      .then((resultado) => {
        ultima = entrada;
        pintaPrevia(previa, resultado, (boton) => {
          boton.disabled = true;
          errorGeneral.hidden = true;
          descargaPdfValoracion(entrada)
            .catch((e: unknown) => {
              errorGeneral.textContent = mensajeApi(e);
              errorGeneral.hidden = false;
            })
            .finally(() => {
              boton.disabled = false;
            });
        });
      })
      .catch((e: unknown) => {
        previa.replaceChildren();
        marcaCamposApi(e);
        errorGeneral.textContent = mensajeApi(e);
        errorGeneral.hidden = false;
      })
      .finally(() => {
        calcular.disabled = false;
      });
  });

  // Si se edita el formulario tras calcular, la vista previa queda obsoleta.
  campos.formulario.addEventListener("input", () => {
    if (ultima !== null) {
      ultima = null;
      previa.replaceChildren();
    }
  });
}
