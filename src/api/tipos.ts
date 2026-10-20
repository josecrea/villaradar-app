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
  disposicion: string | null;
  asignadoA: Asignado;
  recordatorioAt: string | null;
  intentos: number;
  tieneTelefono: boolean;
  vistoAt: string | null;
  actualizadoAt: string;
  lat: number | null;
  lng: number | null;
  fotoUrl: string | null;
  fotosN: number | null;
  publicadoHace: number | null;
  crmRef: string | null;
  crmEstado: string | null;
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

export interface Margen2x1 {
  verdict: string | null;
  marginPct: number | null;
  razones: string[];
}

export interface Ficha extends Item {
  descripcion: string;
  scoreReasons: string[];
  margen2x1: Margen2x1 | null;
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
  zonas: string[];
  tipos: string[];
  portales: string[];
  anunciantes: string[];
  porEtapa: Record<string, number>;
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

export interface Kpis {
  nuevosHoy: number;
  conTelefono: number;
  bajadas7d: number;
  porEtapa: Record<string, number>;
  recordatoriosHoy: number;
  crmPendientes: number;
  crmFallos: number;
  actualizadoAt: string;
}

// --- Valoración (contrato común OT-1a; copia literal de src/informe/tipos.ts de la API) ---
export const IDIOMAS = ["es", "en", "it", "de", "fr", "nl"] as const;
export type Idioma = (typeof IDIOMAS)[number];
export type TipoInmueble = "piso" | "atico" | "duplex" | "estudio" | "casa" | "chalet";
export type CodigoAviso =
  | "superficie_desviada" | "sin_catastro" | "catastro_fallo" | "catastro_varios_inmuebles"
  | "cp_no_coincide_catastro" | "escriturado_poca_muestra" | "escriturado_combo_generico"
  | "escriturado_copia_local" | "arcgis_fallo" | "sin_escriturado" | "comparables_relajados"
  | "pocos_comparables" | "escriturado_supera_oferta" | "abstencion" | "precio_propietario_fuera_mercado";
export interface Aviso { codigo: CodigoAviso; params: Record<string, string | number> }
export type PasoRelajacion = "banos" | "habitaciones_2" | "m2_30" | "zona";
export interface Percentiles { p25: number; p50: number; p75: number }
export interface Testigo {
  estado: "activo" | "inactivo" | "desconocido";
  dias: { n: number; minimo: boolean } | null;
  precio: number; eurM2: number; m2: number; hab: number | null; banos: number | null; zona: string; portal: string;
}
export interface Valoracion {
  id: string; generadoAt: string; idioma: Idioma;
  inmueble: { direccion: string; cp: string; municipio: string; zona: string | null; tipo: TipoInmueble;
    estado: "segunda_mano" | "obra_nueva"; habitaciones: number; banos: number; refCatastral: string | null;
    precioPropietario: number | null; observaciones: string | null };
  superficie: { m2Declarados: number; m2Catastro: number | null; desviacionPct: number | null; m2Base: number;
    origenBase: "catastro" | "declarados"; catastro: "ok" | "sin_ref" | "varios" | "fallo" };
  escriturado: { eurM2: number; compraventas: number | null; combo: { tipo: 9 | 7 | 99; clase: 14 | 15 | 99 };
    fuente: "arcgis" | "latest_json"; fecha: string; valor: number } | null;
  anuncios: { n: number; criterios: { zona: string | null; m2Pct: 20 | 30; habDelta: 1 | 2; banosDelta: 1 | null };
    relajado: PasoRelajacion[]; eurM2: Percentiles | null; valor: Percentiles | null };
  brechaOfertaEscrituraPct: number | null;
  propuesta: { abstencion: boolean; motivo: "sin_evidencia" | "solo_escriturado" | "anuncios";
    ventaRapida: number | null; salida: number | null; techo: number | null;
    posicionPropietario: "por_debajo" | "venta_rapida_salida" | "salida_techo" | "fuera_de_mercado" | null };
  testigos: Testigo[];
  actividadDesde: string | null; actividadVisible: boolean;
  tendencia: { periodo: string; variacionAnualPct: number } | null;
  compradores: { pctExtranjeros: number; primeraNacionalidad: string | null } | null;
  avisos: Aviso[];
}
/** Lo que devuelve POST /api/v1/valoracion: igual, con el texto del aviso en castellano. */
export type ValoracionRespuesta = Omit<Valoracion, "avisos"> & { avisos: (Aviso & { texto: string })[] };

/**
 * Entrada de POST /valoracion y /valoracion/pdf. La API es .strict(): ninguna clave más.
 * Rangos (más estrictos entre el zod de la API y el encargo): direccion 3-160; cp 38xxx;
 * municipio 2-60; zona <=60; m2 entero 10-10000; habitaciones 0-20; banos 0-10;
 * refCatastral 14/18/20 [0-9A-Z]; precioPropietario entero 10000-20000000;
 * observaciones <=1000; listingId <=80.
 */
export interface EntradaValoracion {
  idioma: Idioma;
  direccion: string;
  cp: string;
  municipio: string;
  zona?: string;
  tipo: TipoInmueble;
  estado: "segunda_mano" | "obra_nueva";
  m2: number;
  habitaciones: number;
  banos: number;
  refCatastral?: string;
  precioPropietario?: number;
  observaciones?: string;
  listingId?: string;
}
