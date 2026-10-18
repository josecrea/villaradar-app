import { login as peticionLogin } from "../api/cliente";
import { setToken } from "../api/base";

export interface SesionActual {
  nombre: string;
  rol: string;
}

const SESION_KEY = "vr.sesion";

export function sesionGuardada(): SesionActual | null {
  const crudo = sessionStorage.getItem(SESION_KEY);
  if (!crudo) return null;
  try {
    return JSON.parse(crudo) as SesionActual;
  } catch {
    return null;
  }
}

export async function iniciarSesion(usuario: string, clave: string): Promise<SesionActual> {
  const respuesta = await peticionLogin(usuario, clave);
  setToken(respuesta.token);
  const sesion: SesionActual = { nombre: respuesta.nombre, rol: respuesta.rol };
  sessionStorage.setItem(SESION_KEY, JSON.stringify(sesion));
  return sesion;
}

export function cerrarSesionLocal(): void {
  sessionStorage.removeItem(SESION_KEY);
  sessionStorage.removeItem("vr.token");
}

export function pintaFormularioLogin(contenedor: HTMLElement, alEntrar: () => void): void {
  contenedor.replaceChildren();

  const seccion = document.createElement("section");
  seccion.className = "login-pantalla";
  seccion.setAttribute("aria-labelledby", "login-titulo");

  const titulo = document.createElement("h1");
  titulo.id = "login-titulo";
  titulo.textContent = "VillaRadar — Captación";
  seccion.appendChild(titulo);

  const formulario = document.createElement("form");
  formulario.className = "login-form";
  formulario.noValidate = true;

  const campoUsuario = campoTexto("usuario", "Usuario", "text");
  const campoClave = campoTexto("clave", "Contraseña", "password");
  formulario.appendChild(campoUsuario.contenedor);
  formulario.appendChild(campoClave.contenedor);

  const error = document.createElement("p");
  error.className = "login-error";
  error.setAttribute("role", "alert");
  error.hidden = true;
  formulario.appendChild(error);

  const boton = document.createElement("button");
  boton.type = "submit";
  boton.textContent = "Entrar";
  formulario.appendChild(boton);

  formulario.addEventListener("submit", (ev) => {
    ev.preventDefault();
    error.hidden = true;
    boton.disabled = true;
    iniciarSesion(campoUsuario.input.value.trim(), campoClave.input.value)
      .then(() => alEntrar())
      .catch(() => {
        error.textContent = "Usuario o contraseña incorrectos.";
        error.hidden = false;
      })
      .finally(() => {
        boton.disabled = false;
      });
  });

  seccion.appendChild(formulario);
  contenedor.appendChild(seccion);
  campoUsuario.input.focus();
}

function campoTexto(id: string, etiquetaTexto: string, tipo: string) {
  const contenedor = document.createElement("div");
  contenedor.className = "campo";
  const etiqueta = document.createElement("label");
  etiqueta.htmlFor = id;
  etiqueta.textContent = etiquetaTexto;
  const input = document.createElement("input");
  input.id = id;
  input.name = id;
  input.type = tipo;
  input.autocomplete = tipo === "password" ? "current-password" : "username";
  input.required = true;
  contenedor.appendChild(etiqueta);
  contenedor.appendChild(input);
  return { contenedor, input };
}
