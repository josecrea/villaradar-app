import { URL_CONTACTOS, URL_STOCKS, URL_VALORACION } from "../api/base";

interface ModuloMenu {
  etiqueta: string;
  href: string;
  nativo: boolean;
}

const MODULOS: ModuloMenu[] = [
  { etiqueta: "Captación", href: "#/captacion", nativo: true },
  { etiqueta: "Contactos", href: URL_CONTACTOS, nativo: false },
  { etiqueta: "Stocks", href: URL_STOCKS, nativo: false },
  { etiqueta: "Valoración", href: URL_VALORACION, nativo: false },
];

export function pintaMenu(contenedor: HTMLElement, moduloActivo: string): void {
  contenedor.replaceChildren();
  const nav = document.createElement("nav");
  nav.setAttribute("aria-label", "Módulos de VillaRadar");
  const lista = document.createElement("ul");
  lista.className = "menu-lista";

  for (const modulo of MODULOS) {
    const item = document.createElement("li");
    const enlace = document.createElement("a");
    enlace.href = modulo.href;
    enlace.textContent = modulo.etiqueta;
    if (modulo.nativo) {
      if (modulo.etiqueta.toLowerCase() === moduloActivo) {
        enlace.setAttribute("aria-current", "page");
        enlace.className = "activo";
      }
    } else {
      enlace.target = "_blank";
      enlace.rel = "noopener noreferrer";
    }
    item.appendChild(enlace);
    lista.appendChild(item);
  }
  nav.appendChild(lista);
  contenedor.appendChild(nav);
}
