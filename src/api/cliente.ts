import { EFECTIVO_BASE, getToken, clearToken } from "./base";
import type {
  Novedades,
  Ficha,
  Contacto,
  Facetas,
  LoginRespuesta,
  Filtros,
  Kpis,
  EntradaValoracion,
  ValoracionRespuesta,
} from "./tipos";

export class ErrorApi extends Error {
  constructor(
    public status: number,
    message: string,
    public campos?: string[],
  ) {
    super(message);
  }
}

function camposDe(cuerpo: unknown): string[] | undefined {
  const campos = (cuerpo as { campos?: unknown } | null)?.campos;
  return Array.isArray(campos) ? campos.filter((c): c is string => typeof c === "string") : undefined;
}

async function peticion<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const token = getToken();
  const cabeceras = new Headers(opciones.headers);
  if (token) cabeceras.set("Authorization", `Bearer ${token}`);
  if (opciones.body && !cabeceras.has("Content-Type")) {
    cabeceras.set("Content-Type", "application/json");
  }
  const resp = await fetch(`${EFECTIVO_BASE}${ruta}`, { ...opciones, headers: cabeceras });
  if (resp.status === 401) {
    clearToken();
    throw new ErrorApi(401, "sesion expirada");
  }
  if (!resp.ok) {
    const cuerpo = await resp.json().catch(() => ({ error: "error" }));
    throw new ErrorApi(resp.status, cuerpo.error ?? `error ${resp.status}`, camposDe(cuerpo));
  }
  if (resp.status === 204) return undefined as T;
  return (await resp.json()) as T;
}

export function login(usuario: string, clave: string): Promise<LoginRespuesta> {
  return peticion<LoginRespuesta>("/login", { method: "POST", body: JSON.stringify({ usuario, clave }) });
}

export function logout(): Promise<void> {
  return peticion<void>("/logout", { method: "POST" });
}

function aUrlBusqueda(filtros: Filtros): string {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== "") params.set(clave, valor);
  }
  return params.toString();
}

export function novedades(filtros: Filtros, limit = 50): Promise<Novedades> {
  const qs = aUrlBusqueda({ ...filtros, limit: String(limit) } as Filtros);
  return peticion<Novedades>(`/novedades?${qs}`);
}

export function inmueble(id: string): Promise<Ficha> {
  return peticion<Ficha>(`/inmueble/${encodeURIComponent(id)}`);
}

export function contacto(id: string): Promise<Contacto> {
  return peticion<Contacto>(`/inmueble/${encodeURIComponent(id)}/contacto`);
}

export function cambiaEstado(
  id: string,
  disposicion: string,
  nota?: string,
  recordatorioAt?: string,
): Promise<void> {
  return peticion<void>(`/inmueble/${encodeURIComponent(id)}/estado`, {
    method: "POST",
    body: JSON.stringify({ disposicion, nota, recordatorioAt }),
  });
}

export function asigna(id: string, usuario: string | null): Promise<void> {
  return peticion<void>(`/inmueble/${encodeURIComponent(id)}/asignar`, {
    method: "POST",
    body: JSON.stringify({ usuario }),
  });
}

export function facetas(): Promise<Facetas> {
  return peticion<Facetas>("/facetas");
}

export function kpis(): Promise<Kpis> {
  return peticion<Kpis>("/kpis");
}

export function enviaOdoo(id: string): Promise<{ ok: boolean; estado: string }> {
  return peticion<{ ok: boolean; estado: string }>(`/inmueble/${encodeURIComponent(id)}/odoo`, { method: "POST" });
}

export async function descargaCsv(filtros: Filtros): Promise<void> {
  const token = getToken();
  const qs = aUrlBusqueda(filtros);
  const resp = await fetch(`${EFECTIVO_BASE}/export.csv?${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!resp.ok) throw new ErrorApi(resp.status, "no se pudo exportar");
  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = "captacion.csv";
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

export function valora(entrada: EntradaValoracion): Promise<ValoracionRespuesta> {
  return peticion<ValoracionRespuesta>("/valoracion", { method: "POST", body: JSON.stringify(entrada) });
}

export async function descargaPdfValoracion(entrada: EntradaValoracion): Promise<void> {
  const token = getToken();
  const resp = await fetch(`${EFECTIVO_BASE}/valoracion/pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(entrada),
  });
  if (resp.status === 401) {
    clearToken();
    throw new ErrorApi(401, "sesion expirada");
  }
  if (!resp.ok) {
    const cuerpo = await resp.json().catch(() => ({ error: "error" }));
    throw new ErrorApi(resp.status, cuerpo.error ?? `error ${resp.status}`, camposDe(cuerpo));
  }
  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `valoracion-${entrada.cp}-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
