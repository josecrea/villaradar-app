// Aviso visible y accesible para fallos de red que antes se tragaban con
// `.catch(() => undefined)`: el usuario necesita saber que su acción NO se
// aplicó (p. ej. un arrastre en el kanban que el servidor rechaza).
let contenedorAvisos: HTMLElement | null = null;

function contenedor(): HTMLElement {
  if (contenedorAvisos && document.body.contains(contenedorAvisos)) return contenedorAvisos;
  contenedorAvisos = document.createElement("div");
  contenedorAvisos.className = "avisos-flotantes";
  contenedorAvisos.setAttribute("aria-live", "assertive");
  document.body.appendChild(contenedorAvisos);
  return contenedorAvisos;
}

export function muestraAviso(mensaje: string): void {
  const aviso = document.createElement("p");
  aviso.className = "aviso-flotante";
  aviso.setAttribute("role", "alert");
  aviso.textContent = mensaje;
  contenedor().appendChild(aviso);
  setTimeout(() => aviso.remove(), 5000);
}
