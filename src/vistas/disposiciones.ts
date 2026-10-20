// Disposiciones reales de la cola de llamadas (ver villaradar/src/domain/callQueue.ts).
// La API valida contra esta misma lista; enviar cualquier otro valor da 400.
export type Disposicion =
  | "pendiente"
  | "no_contesta"
  | "buzon"
  | "rellamar"
  | "erroneo"
  | "no_interesado"
  | "no_llamar"
  | "interesado"
  | "cita";

export interface MetaDisposicion {
  valor: Disposicion;
  etiqueta: string;
  necesitaRecordatorio: boolean;
}

export const DISPOSICIONES: MetaDisposicion[] = [
  { valor: "pendiente", etiqueta: "Pendiente", necesitaRecordatorio: false },
  { valor: "no_contesta", etiqueta: "No contesta", necesitaRecordatorio: true },
  { valor: "buzon", etiqueta: "Buzón de voz", necesitaRecordatorio: true },
  { valor: "rellamar", etiqueta: "Rellamar", necesitaRecordatorio: true },
  { valor: "erroneo", etiqueta: "Número erróneo", necesitaRecordatorio: false },
  { valor: "no_interesado", etiqueta: "No interesado", necesitaRecordatorio: false },
  { valor: "no_llamar", etiqueta: "No llamar (opt-out)", necesitaRecordatorio: false },
  { valor: "interesado", etiqueta: "Interesado", necesitaRecordatorio: false },
  { valor: "cita", etiqueta: "Cita agendada", necesitaRecordatorio: false },
];

export function esDisposicionValida(valor: string): valor is Disposicion {
  return DISPOSICIONES.some((d) => d.valor === valor);
}

export function necesitaRecordatorio(valor: Disposicion): boolean {
  return DISPOSICIONES.find((d) => d.valor === valor)?.necesitaRecordatorio ?? false;
}
