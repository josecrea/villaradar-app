import "./estilos/tokens.css";
import "./estilos/base.css";
import "./estilos/componentes.css";
import { EVENTO_SESION_EXPIRADA } from "./api/base";
import { sesionGuardada, pintaFormularioLogin, cerrarSesionLocal } from "./auth/login";
import { pintaMenu } from "./vistas/menu";
import { pintaCaptacion } from "./vistas/captacion";

const raiz = document.querySelector<HTMLDivElement>("#app");
if (!raiz) throw new Error("falta #app en index.html");

function pintaApp(): void {
  raiz!.replaceChildren();

  const sesion = sesionGuardada();
  if (!sesion) {
    pintaFormularioLogin(raiz!, pintaApp);
    return;
  }

  const cabecera = document.createElement("header");
  cabecera.className = "cabecera-app";
  const marca = document.createElement("strong");
  marca.textContent = "VillaRadar";
  cabecera.appendChild(marca);

  const menuContenedor = document.createElement("div");
  cabecera.appendChild(menuContenedor);

  const infoSesion = document.createElement("div");
  infoSesion.className = "info-sesion";
  infoSesion.textContent = `${sesion.nombre}`;
  const botonSalir = document.createElement("button");
  botonSalir.type = "button";
  botonSalir.className = "boton-secundario";
  botonSalir.textContent = "Salir";
  botonSalir.addEventListener("click", () => {
    cerrarSesionLocal();
    pintaApp();
  });
  infoSesion.appendChild(botonSalir);
  cabecera.appendChild(infoSesion);

  raiz!.appendChild(cabecera);
  pintaMenu(menuContenedor, "captación");

  const main = document.createElement("main");
  main.id = "contenido-principal";
  raiz!.appendChild(main);

  void pintaCaptacion(main);
}

window.addEventListener("hashchange", pintaApp);
window.addEventListener(EVENTO_SESION_EXPIRADA, pintaApp);
pintaApp();
