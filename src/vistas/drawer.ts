// Drawer de ficha con <dialog>. Esc cierra (nativo); el foco vuelve al
// elemento que abrió el drawer al cerrarse.
import type { Ficha } from "../api/tipos";
import { pintaFicha } from "./ficha";
import { URL_CONTACTOS } from "../api/base";

export function abrirDrawerFicha(ficha: Ficha, onCerrado: () => void): void {
  const origen = document.activeElement as HTMLElement | null;

  const dialogo = document.createElement("dialog");
  dialogo.className = "drawer-ficha";
  dialogo.setAttribute("aria-label", `Ficha de ${ficha.titulo}`);

  const cuerpo = document.createElement("div");
  cuerpo.className = "drawer-ficha-cuerpo";

  const cerrar = document.createElement("button");
  cerrar.type = "button";
  cerrar.className = "drawer-ficha-cerrar";
  cerrar.textContent = "Cerrar ✕";
  cerrar.addEventListener("click", () => dialogo.close());
  cuerpo.appendChild(cerrar);

  const contenido = document.createElement("div");
  cuerpo.appendChild(contenido);

  if (ficha.crmRef) {
    const enlace = document.createElement("a");
    enlace.href = `${URL_CONTACTOS}/${encodeURIComponent(ficha.crmRef)}`;
    enlace.target = "_blank";
    enlace.rel = "noopener noreferrer";
    enlace.textContent = "Ver en Odoo";
    enlace.className = "boton-secundario";
    cuerpo.appendChild(enlace);
  }

  dialogo.appendChild(cuerpo);
  document.body.appendChild(dialogo);

  pintaFicha(contenido, ficha, () => dialogo.close());

  dialogo.addEventListener("close", () => {
    dialogo.remove();
    origen?.focus();
    onCerrado();
  });

  dialogo.showModal();
}
