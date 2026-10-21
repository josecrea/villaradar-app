// Verifica POST /valoracion: contrato de la API (CONTRATO-V1.json) frente al front y al mock.
//
//   node scripts/verificar-contrato.mjs --contrato <CONTRATO-V1.json> --mock <dir mock> \
//        [--tipos-api <src/informe/tipos.ts de la API>]
//
// (Las rutas entran por argumento: ninguna ruta del Mac va en el repo público.)
// Comprobaciones (rc=1 si hay UNA divergencia; rc=2 si falta una entrada o el uso es erróneo):
//  A) respuesta200 de POST /valoracion frente a `ValoracionRespuesta` de src/api/tipos.ts:
//     campos, nulabilidad, tipos/valores donde el contrato los dice, códigos de Limite.
//  B) <mock>/fixtures/valoracion.json (lo que sirve el mock) validado contra el contrato Y
//     contra los tipos del front: claves de más y de menos, null donde no cabe, valores fuera
//     de enumeración, tipos erróneos.
//  C) con --tipos-api: el bloque común (de `export const IDIOMAS` al cierre de
//     `ValoracionRespuesta`) es idéntico línea a línea al de la API.
// No mira los otros fixtures (items, fichas, contactos, facetas): eso es del verificador de la
// campaña. Sin dependencias nuevas: usa `typescript`, que ya es devDependency.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TIPOS_FRONT = resolve(RAIZ, "src/api/tipos.ts");

function lee(argv) {
  const o = {};
  const validos = { "--contrato": "contrato", "--mock": "mock", "--tipos-api": "tiposApi" };
  for (let i = 0; i < argv.length; i++) {
    const k = validos[argv[i]];
    if (!k || i + 1 >= argv.length) {
      console.error(`verificar-contrato: parámetro no reconocido o sin valor: «${argv[i]}». Solo --contrato, --mock, --tipos-api.`);
      process.exit(2);
    }
    o[k] = resolve(argv[++i]);
  }
  return o;
}
const { contrato: rutaContrato, mock: rutaMock, tiposApi: rutaTiposApi } = lee(process.argv.slice(2));
if (!rutaContrato || !rutaMock) {
  console.error("uso: node scripts/verificar-contrato.mjs --contrato <CONTRATO-V1.json> --mock <dir mock> [--tipos-api <tipos.ts>]");
  process.exit(2);
}

const diferencias = [];
const avisos = [];
const dif = (m) => diferencias.push(m);

/* ── Nodo normalizado: { toks:Set|null, nullable, obj:Map|null, arr:nodo|null|"opaco" } ── */
const nodo = () => ({ toks: new Set(), nullable: false, obj: null, arr: null, tipado: false });

function fusiona(a, b) {
  for (const t of b.toks) a.toks.add(t);
  a.nullable ||= b.nullable;
  a.tipado ||= b.tipado;
  if (b.obj) {
    a.obj ??= new Map();
    for (const [k, v] of b.obj) a.obj.set(k, a.obj.has(k) ? fusiona(a.obj.get(k), v) : v);
  }
  if (b.arr) a.arr = a.arr && a.arr !== "opaco" && b.arr !== "opaco" ? fusiona(a.arr, b.arr) : b.arr;
  return a;
}

/* ── Lado front: el checker de TypeScript expande alias, Omit e intersecciones ── */
const programa = ts.createProgram([TIPOS_FRONT], { strict: true, noEmit: true, skipLibCheck: true, target: ts.ScriptTarget.ES2022 });
const checker = programa.getTypeChecker();
const fuente = programa.getSourceFile(TIPOS_FRONT);
if (!fuente) { console.error(`no se puede leer ${TIPOS_FRONT}`); process.exit(2); }

function aNodoFront(tipo, profundidad = 0) {
  const n = nodo();
  n.tipado = true;
  if (profundidad > 12) return n;
  const f = ts.TypeFlags;
  if (tipo.flags & f.Union) {
    for (const m of tipo.types) {
      if (m.flags & f.Undefined) continue;
      fusiona(n, aNodoFront(m, profundidad + 1));
    }
    return n;
  }
  if (tipo.flags & f.Null) { n.nullable = true; return n; }
  if (tipo.flags & f.StringLiteral) { n.toks.add(String(tipo.value)); return n; }
  if (tipo.flags & f.NumberLiteral) { n.toks.add(String(tipo.value)); return n; }
  if (tipo.flags & f.BooleanLiteral) { n.toks.add("boolean"); return n; }
  if (tipo.flags & f.String) { n.toks.add("string"); return n; }
  if (tipo.flags & f.Number) { n.toks.add("number"); return n; }
  if (tipo.flags & f.Boolean) { n.toks.add("boolean"); return n; }
  if (checker.isArrayType(tipo)) {
    n.arr = aNodoFront(checker.getTypeArguments(tipo)[0], profundidad + 1);
    return n;
  }
  if (tipo.flags & (f.Object | f.Intersection)) {
    n.obj = new Map();
    for (const sym of checker.getPropertiesOfType(tipo)) {
      const t = checker.getTypeOfSymbolAtLocation(sym, sym.valueDeclaration ?? sym.declarations?.[0] ?? fuente);
      n.obj.set(sym.getName(), aNodoFront(t, profundidad + 1));
    }
    n.abierto = checker.getIndexInfosOfType(tipo).length > 0; // Record<string, …>
    return n;
  }
  return n;
}

function raizFront() {
  let decl = null;
  ts.forEachChild(fuente, (c) => {
    if (ts.isTypeAliasDeclaration(c) && c.name.text === "ValoracionRespuesta") decl = c;
  });
  if (!decl) { console.error("src/api/tipos.ts no exporta ValoracionRespuesta"); process.exit(2); }
  return aNodoFront(checker.getTypeFromTypeNode(decl.type));
}

/* ── Lado contrato: JSON con cadenas descriptivas ("string|null (…)", "{ a, b{c}|null }") ── */
function cortaComentario(s) {
  let d = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if ("{([".includes(c)) d++;
    else if ("})]".includes(c)) d--;
    else if (c === " " && s[i + 1] === "(" && d === 0) return s.slice(0, i);
  }
  return s;
}

function parteEn(s, sep) {
  const partes = [];
  let d = 0, ini = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if ("{([".includes(c)) d++;
    else if ("})]".includes(c)) d--;
    else if (c === sep && d === 0) { partes.push(s.slice(ini, i)); ini = i + 1; }
  }
  partes.push(s.slice(ini));
  return partes.map((p) => p.trim()).filter(Boolean);
}

function cierre(s, i) {
  const abre = s[i], cierra = { "{": "}", "(": ")", "[": "]" }[abre];
  let d = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === abre) d++;
    else if (s[j] === cierra && --d === 0) return j;
  }
  throw new Error(`grupo sin cerrar en: ${s}`);
}

function parseAlternativas(s, n) {
  for (const alt of parteEn(s, "|")) {
    if (alt === "null") { n.nullable = true; n.tipado = true; continue; }
    if (alt.startsWith("{")) {
      const fin = cierre(alt, 0);
      n.obj = parseCampos(alt.slice(1, fin));
      n.tipado = true;
      if (alt.slice(fin + 1).startsWith("[]")) { // objeto[]
        const item = nodo(); item.obj = n.obj; item.tipado = true;
        n.obj = null; n.arr = item;
      }
      continue;
    }
    if (alt.endsWith("[]")) { n.arr = "opaco"; n.tipado = true; continue; }
    if (/^[A-Za-z0-9_.]+$/.test(alt)) { n.toks.add(alt); n.tipado = true; continue; }
    avisos.push(`alternativa no entendida en el contrato: «${alt}»`);
  }
  return n;
}

function parseCampos(s) {
  const mapa = new Map();
  for (const campo of parteEn(s, ",")) {
    const m = /^([A-Za-z0-9_]+)(.*)$/s.exec(campo);
    if (!m) { avisos.push(`campo no entendido en el contrato: «${campo}»`); continue; }
    let resto = m[2].trim();
    const n = nodo();
    if (resto.startsWith("(")) { // nombre(a|b|c): enumeración; con un solo valor es un comentario
      const fin = cierre(resto, 0);
      const valores = resto.slice(1, fin);
      if (valores.includes("|")) parseAlternativas(valores, n);
      resto = resto.slice(fin + 1);
    } else if (resto.startsWith("{")) {
      const fin = cierre(resto, 0);
      n.obj = parseCampos(resto.slice(1, fin)); n.tipado = true;
      resto = resto.slice(fin + 1);
    } else if (resto.startsWith("[")) {
      const fin = cierre(resto, 0);
      const dentro = resto.slice(1, fin).trim();
      if (dentro.startsWith("{")) {
        const item = nodo(); item.obj = parseCampos(dentro.slice(1, cierre(dentro, 0))); item.tipado = true;
        n.arr = item;
      } else n.arr = "opaco";
      n.tipado = true;
      resto = resto.slice(fin + 1);
    }
    if (resto.startsWith("|")) parseAlternativas(resto.slice(1), n);
    mapa.set(m[1], n);
  }
  return mapa;
}

function aNodoContrato(v) {
  const n = nodo();
  if (v && typeof v === "object" && !Array.isArray(v)) {
    n.obj = new Map(Object.entries(v).map(([k, x]) => [k, aNodoContrato(x)]));
    n.tipado = true;
    return n;
  }
  if (typeof v === "string") return parseAlternativas(cortaComentario(v.trim()), n);
  avisos.push(`valor no entendido en el contrato: ${JSON.stringify(v)}`);
  return n;
}

/* ── Comparación ── */
const fmt = (s) => [...s].sort().join("|") || "(sin tipo)";

function compara(ruta, c, f) {
  if (f.nullable !== c.nullable && (c.nullable || c.tipado)) {
    dif(`${ruta}: nulabilidad — contrato ${c.nullable ? "admite" : "no admite"} null, front ${f.nullable ? "admite" : "no admite"}`);
  }
  if (c.toks.size > 0) {
    if (fmt(c.toks) !== fmt(f.toks)) dif(`${ruta}: valores/tipo — contrato «${fmt(c.toks)}», front «${fmt(f.toks)}»`);
  }
  if (c.obj) {
    if (!f.obj) { dif(`${ruta}: el contrato es un objeto y el front no`); return; }
    for (const [k, cv] of c.obj) {
      if (!f.obj.has(k)) dif(`${ruta}.${k}: está en el contrato y falta en el front`);
      else compara(`${ruta}.${k}`, cv, f.obj.get(k));
    }
    for (const k of f.obj.keys()) if (!c.obj.has(k)) dif(`${ruta}.${k}: está en el front y falta en el contrato`);
  } else if (f.obj && f.obj.size > 0 && c.tipado) {
    dif(`${ruta}: el front tiene campos (${[...f.obj.keys()].join(", ")}) y el contrato no describe un objeto`);
  }
  if (c.arr) {
    if (!f.arr) { dif(`${ruta}: el contrato es una lista y el front no`); return; }
    if (c.arr !== "opaco") compara(`${ruta}[]`, c.arr, f.arr);
  } else if (f.arr && c.tipado) {
    dif(`${ruta}: el front es una lista y el contrato no`);
  }
}

/* ── A: contrato JSON frente a tipos.ts ── */
const contrato = JSON.parse(readFileSync(rutaContrato, "utf8"));
const ep = (contrato.endpoints ?? []).find((e) => e.ruta === "/valoracion" && e.metodo === "POST");
if (!ep?.respuesta200) { console.error("el contrato no tiene POST /valoracion → respuesta200"); process.exit(2); }
const nContrato = aNodoContrato(ep.respuesta200);
const nFront = raizFront();
const campos200 = nContrato.obj?.size ?? 0;
if (campos200 < 10) { console.error(`respuesta200 sospechosamente corta (${campos200} campos): no verifico`); process.exit(2); }
compara("respuesta200", nContrato, nFront);

const codigosContrato = nContrato.obj.get("limites")?.arr?.obj?.get("codigo")?.toks ?? new Set();
const codigosFront = nFront.obj.get("limites")?.arr?.obj?.get("codigo")?.toks ?? new Set();
console.log(`contrato ${contrato.version} · campos de respuesta200: ${campos200} · versión del contrato: ${contrato.version}`);
console.log(`códigos de Limite (contrato): ${fmt(codigosContrato)}`);
console.log(`códigos de Limite (front)   : ${fmt(codigosFront)}`);
if (codigosContrato.size === 0) dif("no se han podido leer los códigos de Limite del contrato");

/* ── B: el fixture del mock (una instancia) frente a un nodo ── */
function tipoDe(v) { return Array.isArray(v) ? "array" : typeof v; }
function valida(ruta, v, n, quien) {
  if (v === null) {
    if (!n.nullable && (n.tipado || quien === "front")) dif(`${quien}: ${ruta} es null en el mock y el ${quien} no lo admite`);
    return;
  }
  const t = tipoDe(v);
  if (n.toks.size > 0 && ["string", "number", "boolean"].includes(t)) {
    if (!n.toks.has(t) && !n.toks.has(String(v))) dif(`${quien}: ${ruta} = ${JSON.stringify(v)} no está en «${fmt(n.toks)}»`);
  } else if (n.toks.size > 0 && !n.obj && !n.arr) {
    dif(`${quien}: ${ruta} es ${t} y se esperaba «${fmt(n.toks)}»`);
  }
  if (n.obj) {
    if (t !== "object") { dif(`${quien}: ${ruta} es ${t} y se esperaba un objeto`); return; }
    if (n.abierto) return;
    for (const [k, nk] of n.obj) {
      if (!(k in v)) dif(`${quien}: ${ruta}.${k} falta en el mock`);
      else valida(`${ruta}.${k}`, v[k], nk, quien);
    }
    for (const k of Object.keys(v)) if (!n.obj.has(k)) dif(`${quien}: ${ruta}.${k} está en el mock y no en el ${quien}`);
  } else if (n.arr) {
    if (t !== "array") { dif(`${quien}: ${ruta} es ${t} y se esperaba una lista`); return; }
    if (n.arr !== "opaco") v.forEach((x, i) => valida(`${ruta}[${i}]`, x, n.arr, quien));
  }
}
const rutaFixture = resolve(rutaMock, "fixtures/valoracion.json");
let fixture;
try { fixture = JSON.parse(readFileSync(rutaFixture, "utf8")); }
catch (e) { console.error(`no puedo leer ${rutaFixture}: ${e.message}`); process.exit(2); }
valida("valoracion.json", fixture, nContrato, "contrato");
valida("valoracion.json", fixture, nFront, "front");
console.log(`fixture del mock: ${Object.keys(fixture).length} claves, ${fixture.testigos?.length ?? 0} testigos, ${fixture.limites?.length ?? 0} límites`);

/* ── C: bloque común frente al tipos.ts de la API ── */
function bloqueComun(texto) {
  const l = texto.split("\n");
  const ini = l.findIndex((x) => /^export const IDIOMAS/.test(x));
  const tipoResp = l.findIndex((x) => /^export type ValoracionRespuesta/.test(x));
  if (ini < 0 || tipoResp < 0) return null;
  let fin = tipoResp;
  while (fin < l.length && !/\};\s*$/.test(l[fin])) fin++;
  return l.slice(ini, fin + 1).map((x) => x.replace(/\s+$/, ""));
}
if (rutaTiposApi) {
  const a = bloqueComun(readFileSync(rutaTiposApi, "utf8"));
  const b = bloqueComun(readFileSync(TIPOS_FRONT, "utf8"));
  if (!a || !b) { dif("no encuentro el bloque común (IDIOMAS…ValoracionRespuesta) en uno de los tipos.ts"); }
  else {
    console.log(`bloque común: API ${a.length} líneas · front ${b.length} líneas`);
    const max = Math.max(a.length, b.length);
    for (let i = 0; i < max; i++) {
      if (a[i] !== b[i]) dif(`bloque común, línea ${i + 1}: API «${a[i] ?? "(no hay)"}» · front «${b[i] ?? "(no hay)"}»`);
    }
  }
} else {
  avisos.push("sin tipos.ts de la API: no se compara el bloque común línea a línea (solo el contrato JSON)");
}

for (const a of avisos) console.log(`aviso: ${a}`);
if (diferencias.length) {
  console.log(`\n${diferencias.length} DIFERENCIA(S):`);
  for (const d of diferencias) console.log(`  - ${d}`);
  process.exit(1);
}
const nEndpoints = contrato.endpoints.length;
console.log(`OK: contrato con ${nEndpoints} endpoints; POST /valoracion verificado contra tipos.ts y mock/fixtures/valoracion.json, 0 divergencias`);
