// Tipos del contrato API v1 — ver docs/CONTRATO-V1.json (OT-1, backend).
// PROHIBIDO: nunca añadir aqui "telefono" ni "descripcion" al tipo Item (listado).

export type Etapa = "novedad" | "contactado" | "en_espera" | "captado" | "rechazado";
export type Asignado = "jose" | "valeria" | null;
export type Rol = "jose" | "valeria";

export interface Item {
  id: string;
  portal: string;
  url: string;
  titulo: string;
  tipo: string;
  operacion: string;
  precio: number;
  precioAnterior: number | null;
  variacionPct: number | null;
  m2: number | null;
  hab: number | null;
  banos: number | null;
  municipio: string;
  anunciante: string;
  score: number;
  razonesTop3: string[];
  etapa: Etapa;
  disposicion: string;
  asignadoA: Asignado;
  recordatorioAt: string | null;
  intentos: number;
  tieneTelefono: boolean;
  vistoAt: string | null;
  actualizadoAt: string;
}

export interface Novedades {
  total: number;
  cursor: string | null;
  items: Item[];
}

export interface HistoricoPunto {
  fecha: string;
  precio: number;
}

export interface Evento {
  tipo: string;
  at: string;
  usuario?: string;
  nota?: string;
  de?: string;
  a?: string;
}

export interface Ficha extends Item {
  descripcion: string;
  scoreReasons: string[];
  margen2x1: string[] | null;
  historicoPrecios: HistoricoPunto[];
  eventos: Evento[];
}

export interface Contacto {
  telefono: string;
  waMe: string;
  tel: string;
  origen: string;
  confianza: string;
}

export interface Facetas {
  [clave: string]: Array<{ valor: string; total: number }>;
}

export interface LoginRespuesta {
  token: string;
  expira: string;
  nombre: string;
  rol: Rol;
}

export interface Filtros {
  q?: string;
  portal?: string;
  zona?: string;
  tipo?: string;
  operacion?: string;
  anunciante?: string;
  precioMin?: string;
  precioMax?: string;
  m2min?: string;
  habmin?: string;
  banosmin?: string;
  tel?: string;
  min?: string;
  etapa?: string;
  asignado?: string;
  orden?: string;
  cursor?: string;
}
