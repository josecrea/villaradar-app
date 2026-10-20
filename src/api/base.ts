// Config leída UNA vez desde import.meta.env (Vite). Nada de leer env disperso por el código.
export const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? "https://villaradar.zohmip.easypanel.host/api/v1";

export const API_MOCK: boolean = import.meta.env.VITE_API_MOCK === "1";

export const EFECTIVO_BASE: string = API_MOCK ? "/api/v1" : API_BASE;

export const URL_CONTACTOS: string =
  (import.meta.env.VITE_URL_CONTACTOS as string | undefined) ?? "https://odoo.okservice.es/odoo/crm";
export const URL_STOCKS: string =
  (import.meta.env.VITE_URL_STOCKS as string | undefined) ?? "https://villasproperties.es";
export const URL_VALORACION = "https://valoracion.zohmip.easypanel.host";

const TOKEN_KEY = "vr.token";

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export const EVENTO_SESION_EXPIRADA = "vr:sesion-expirada";

// 401 con sesión: borra token Y sesión guardada y avisa a la app para volver al login.
export function sesionExpirada(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem("vr.sesion");
  window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA));
}
