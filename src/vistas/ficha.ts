import type { Ficha, Contacto } from "../api/tipos";
import { contacto as pideContacto, cambiaEstado, asigna } from "../api/cliente";
import { pintaEtapaChip } from "./embudo";
import { DISPOSICIONES, necesitaRecordatorio, type Disposicion } from "./disposiciones";

function sparkline(puntosDesc: Array<{ fecha: string; precio: number }>): SVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 200 50");
  svg.setAttribute("width", "200");
  svg.setAttribute("height", "50");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Histórico de precio");
  // La API devuelve el histórico en orden DESC (más reciente primero);
  // la sparkline se dibuja en orden cronológico ascendente.
  const puntos = [...puntosDesc].sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (puntos.length < 2) return svg;
  const precios = puntos.map((p) => p.precio);
  const min = Math.min(...precios);
  const max = Math.max(...precios);
  const rango = max - min || 1;
  const paso = 200 / (puntos.length - 1);
  const coords = puntos.map((p, i) => {
    const x = i * paso;
    const y = 45 - ((p.precio - min) / rango) * 40;
    return `${x},${y}`;
  });
  const linea = document.createElementNS(ns, "polyline");
  linea.setAttribute("points", coords.join(" "));
  linea.setAttribute("fill", "none");
  linea.setAttribute("stroke", "currentColor");
  linea.setAttribute("stroke-width", "2");
  svg.appendChild(linea);
  return svg;
}

export function pintaFicha(contenedor: HTMLElement, ficha: Ficha, onVolver: () => void): void {
  contenedor.replaceChildren();

  const botonVolver = document.createElement("button");
  botonVolver.type = "button";
  botonVolver.className = "boton-secundario";
  botonVolver.textContent = "← Volver a la tabla";
  botonVolver.addEventListener("click", onVolver);
  contenedor.appendChild(botonVolver);

  const botonInforme = document.createElement("button");
  botonInforme.type = "button";
  botonInforme.className = "boton-secundario";
  botonInforme.textContent = "Informe de valoración";
  botonInforme.addEventListener("click", () => {
    botonInforme.closest("dialog")?.close();
    location.hash = "#/valoracion?listing=" + encodeURIComponent(ficha.id);
  });
  contenedor.appendChild(botonInforme);

  const articulo = document.createElement("article");
  articulo.className = "ficha";

  const titulo = document.createElement("h1");
  titulo.textContent = ficha.titulo;
  articulo.appendChild(titulo);

  const meta = document.createElement("p");
  meta.className = "ficha-meta";
  meta.textContent = `${ficha.municipio} · ${ficha.tipo} · ${ficha.operacion}`;
  articulo.appendChild(meta);

  const precioBloque = document.createElement("p");
  precioBloque.className = "ficha-precio tabular-nums";
  precioBloque.textContent = `${Math.round(ficha.precio).toLocaleString("es-ES")} €`;
  articulo.appendChild(precioBloque);

  const descripcion = document.createElement("p");
  descripcion.className = "ficha-descripcion";
  descripcion.textContent = ficha.descripcion;
  articulo.appendChild(descripcion);

  const scoreSeccion = document.createElement("section");
  scoreSeccion.setAttribute("aria-labelledby", "score-titulo");
  const scoreTitulo = document.createElement("h2");
  scoreTitulo.id = "score-titulo";
  scoreTitulo.textContent = `Score: ${ficha.score}`;
  scoreSeccion.appendChild(scoreTitulo);
  const razonesLista = document.createElement("ul");
  for (const razon of ficha.scoreReasons) {
    const li = document.createElement("li");
    li.textContent = razon;
    razonesLista.appendChild(li);
  }
  scoreSeccion.appendChild(razonesLista);
  articulo.appendChild(scoreSeccion);

  if (ficha.margen2x1) {
    const bloque2x1 = document.createElement("section");
    const h2 = document.createElement("h2");
    h2.textContent = "Margen 2x1";
    bloque2x1.appendChild(h2);
    if (ficha.margen2x1.marginPct !== null) {
      const margen = document.createElement("p");
      margen.className = "tabular-nums";
      margen.textContent = `Margen estimado: ${ficha.margen2x1.marginPct}%`;
      bloque2x1.appendChild(margen);
    }
    const lista = document.createElement("ul");
    for (const razon of ficha.margen2x1.razones) {
      const li = document.createElement("li");
      li.textContent = razon;
      lista.appendChild(li);
    }
    bloque2x1.appendChild(lista);
    articulo.appendChild(bloque2x1);
  }

  const historicoSeccion = document.createElement("section");
  const h2Historico = document.createElement("h2");
  h2Historico.textContent = "Histórico de precio";
  historicoSeccion.appendChild(h2Historico);
  historicoSeccion.appendChild(sparkline(ficha.historicoPrecios));
  articulo.appendChild(historicoSeccion);

  articulo.appendChild(pintaBloqueContacto(ficha.id));
  articulo.appendChild(pintaBloqueEstado(ficha));
  articulo.appendChild(pintaBloqueAsignacion(ficha));

  contenedor.appendChild(articulo);
}

function pintaBloqueContacto(id: string): HTMLElement {
  const seccion = document.createElement("section");
  const h2 = document.createElement("h2");
  h2.textContent = "Contacto";
  seccion.appendChild(h2);

  const boton = document.createElement("button");
  boton.type = "button";
  boton.textContent = "Ver contacto";
  const resultado = document.createElement("div");
  resultado.className = "contacto-resultado";

  boton.addEventListener("click", () => {
    boton.disabled = true;
    pideContacto(id)
      .then((contacto: Contacto) => {
        resultado.replaceChildren();
        const enlaceWa = document.createElement("a");
        enlaceWa.href = contacto.waMe;
        enlaceWa.target = "_blank";
        enlaceWa.rel = "noopener noreferrer";
        enlaceWa.className = "boton-whatsapp";
        enlaceWa.textContent = "Abrir WhatsApp";
        const enlaceTel = document.createElement("a");
        enlaceTel.href = contacto.tel;
        enlaceTel.textContent = contacto.telefono;
        resultado.appendChild(enlaceWa);
        resultado.appendChild(document.createTextNode(" · "));
        resultado.appendChild(enlaceTel);
      })
      .catch(() => {
        resultado.textContent = "No se pudo obtener el contacto.";
      })
      .finally(() => {
        boton.disabled = false;
      });
  });

  seccion.appendChild(boton);
  seccion.appendChild(resultado);
  return seccion;
}

function pintaBloqueEstado(ficha: Ficha): HTMLElement {
  const seccion = document.createElement("section");
  const h2 = document.createElement("h2");
  h2.textContent = "Estado del embudo";
  seccion.appendChild(h2);

  // La etapa es DERIVADA por la API a partir de la disposición (ver embudo.ts
  // del backend); aquí se muestra, no se elige directamente.
  const etapaActual = document.createElement("p");
  etapaActual.append("Etapa actual: ");
  etapaActual.appendChild(pintaEtapaChip(ficha.etapa));
  seccion.appendChild(etapaActual);

  const selectorDisposicion = document.createElement("select");
  selectorDisposicion.id = `disposicion-${ficha.id}`;
  selectorDisposicion.setAttribute("aria-label", "Marcar disposición tras la llamada");
  for (const meta of DISPOSICIONES) {
    const opcion = document.createElement("option");
    opcion.value = meta.valor;
    opcion.textContent = meta.etiqueta;
    opcion.selected = meta.valor === (ficha.disposicion ?? "pendiente");
    selectorDisposicion.appendChild(opcion);
  }

  const campoRecordatorio = document.createElement("input");
  campoRecordatorio.type = "date";
  campoRecordatorio.setAttribute("aria-label", "Fecha de recordatorio");
  campoRecordatorio.hidden = !necesitaRecordatorio((ficha.disposicion as Disposicion) ?? "pendiente");

  selectorDisposicion.addEventListener("change", () => {
    campoRecordatorio.hidden = !necesitaRecordatorio(selectorDisposicion.value as Disposicion);
  });

  const nota = document.createElement("textarea");
  nota.setAttribute("aria-label", "Nota");
  nota.placeholder = "Nota (opcional)";

  const error = document.createElement("p");
  error.className = "estado-error";
  error.setAttribute("role", "alert");
  error.hidden = true;

  const guardar = document.createElement("button");
  guardar.type = "button";
  guardar.textContent = "Guardar disposición";
  guardar.addEventListener("click", () => {
    error.hidden = true;
    const disposicion = selectorDisposicion.value as Disposicion;
    if (necesitaRecordatorio(disposicion) && !campoRecordatorio.value) {
      error.textContent = "Esta disposición necesita una fecha de recordatorio.";
      error.hidden = false;
      return;
    }
    const recordatorioAt = campoRecordatorio.value
      ? new Date(campoRecordatorio.value).toISOString()
      : undefined;
    guardar.disabled = true;
    cambiaEstado(ficha.id, disposicion, nota.value || undefined, recordatorioAt)
      .catch(() => {
        error.textContent = "No se pudo guardar la disposición.";
        error.hidden = false;
      })
      .finally(() => {
        guardar.disabled = false;
      });
  });

  seccion.appendChild(selectorDisposicion);
  seccion.appendChild(campoRecordatorio);
  seccion.appendChild(nota);
  seccion.appendChild(error);
  seccion.appendChild(guardar);
  return seccion;
}

function pintaBloqueAsignacion(ficha: Ficha): HTMLElement {
  const seccion = document.createElement("section");
  const h2 = document.createElement("h2");
  h2.textContent = "Asignación";
  seccion.appendChild(h2);

  const selector = document.createElement("select");
  selector.setAttribute("aria-label", "Asignar a");
  const opciones: Array<[string, string]> = [
    ["", "Sin asignar"],
    ["jose", "Jose"],
    ["valeria", "Valeria"],
  ];
  for (const [valor, etiqueta] of opciones) {
    const opcion = document.createElement("option");
    opcion.value = valor;
    opcion.textContent = etiqueta;
    opcion.selected = (ficha.asignadoA ?? "") === valor;
    selector.appendChild(opcion);
  }
  selector.addEventListener("change", () => {
    asigna(ficha.id, selector.value || null).catch(() => {
      /* ídem: reflejar en aviso visual futuro */
    });
  });

  seccion.appendChild(selector);
  return seccion;
}
