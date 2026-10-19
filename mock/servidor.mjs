// Servidor mock de /api/v1 para desarrollo y e2e. Sirve los fixtures sintéticos.
// Nunca usar en produccion: sin autenticacion real, sin rate limit real.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));
const PUERTO = Number(process.env.MOCK_PORT ?? 8787);

async function cargaFixture(nombre) {
  const ruta = join(AQUI, "fixtures", nombre);
  return JSON.parse(await readFile(ruta, "utf-8"));
}

// Estado mutable en memoria para que /estado y /asignar se reflejen en
// /novedades y /kpis durante la sesión del mock (nunca persiste a disco).
let itemsEnMemoria = null;
async function itemsVivos() {
  if (!itemsEnMemoria) itemsEnMemoria = await cargaFixture("items.json");
  return itemsEnMemoria;
}

// Misma derivación disposición → etapa que usa kanban.ts en el front
// (la etapa real la deriva el backend; aquí replicamos para que el mock no
// quede en verde falso).
const ETAPA_POR_DISPOSICION = {
  pendiente: "novedad",
  no_contesta: "contactado",
  buzon: "en_espera",
  rellamar: "contactado",
  erroneo: "rechazado",
  no_interesado: "rechazado",
  no_llamar: "rechazado",
  interesado: "en_espera",
  cita: "captado",
};

function envia(res, status, cuerpo) {
  const json = cuerpo === undefined ? "" : JSON.stringify(cuerpo);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization,Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(json);
}

const TOKEN_MOCK = "v1.jose.9999999999.1.mock";

// Fecha fija para capturas deterministas (ver tests/e2e).
const AHORA_FIJA = "2026-10-19T09:00:00Z";

const ORDEN_VALIDOS = new Set(["", "precio", "-precio", "score", "-score"]);

// Mismas disposiciones que la cola real (villaradar/src/domain/callQueue.ts):
// validar igual que la API evita que el e2e quede en verde falso.
const DISPOSICIONES_VALIDAS = [
  "pendiente",
  "no_contesta",
  "buzon",
  "rellamar",
  "erroneo",
  "no_interesado",
  "no_llamar",
  "interesado",
  "cita",
];

// PNG 1x1 válido (verde-gris suave, cerca de --surf2) reutilizado como tesela
// y como foto: determinista (nunca depende de red externa), basta para que
// naturalWidth > 0 en el navegador, y no deja el mapa en negro.
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mO48+QuAAU9Ap7JJ9MXAAAAAElFTkSuQmCC",
  "base64",
);

function enviaPng(res) {
  res.writeHead(200, {
    "Content-Type": "image/png",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(PNG_1X1);
}

async function manejador(req, res) {
  const url = new URL(req.url, `http://localhost:${PUERTO}`);

  // Teselas y fotos servidas por el propio mock: deterministas, sin depender
  // de red externa (openstreetmap.org / fotocasa.es) durante las capturas e2e.
  if (/^\/_t\/\d+\/\d+\/\d+\.png$/.test(url.pathname)) return enviaPng(res);
  if (/^\/_foto\//.test(url.pathname)) return enviaPng(res);

  const ruta = url.pathname.replace(/^\/api\/v1/, "");

  if (req.method === "OPTIONS") return envia(res, 204, undefined);

  if (ruta === "/health") return envia(res, 200, { ok: true, v: "1" });

  if (ruta === "/login" && req.method === "POST") {
    const cuerpo = await leeJson(req);
    if (cuerpo.usuario && cuerpo.clave) {
      return envia(res, 200, {
        token: TOKEN_MOCK,
        expira: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
        nombre: cuerpo.usuario === "valeria" ? "Valeria" : "Jose",
        rol: cuerpo.usuario === "valeria" ? "valeria" : "jose",
      });
    }
    return envia(res, 401, { error: "credenciales" });
  }

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return envia(res, 401, { error: "credenciales" });

  if (ruta === "/logout" && req.method === "POST") return envia(res, 204, undefined);

  if (ruta === "/novedades") {
    const items = await itemsVivos();
    let filtrados = items;
    const etapa = url.searchParams.get("etapa");
    if (etapa) filtrados = filtrados.filter((i) => i.etapa === etapa);
    const zona = url.searchParams.get("zona");
    if (zona) filtrados = filtrados.filter((i) => i.municipio.toLowerCase().includes(zona.toLowerCase()));
    const portal = url.searchParams.get("portal");
    if (portal) filtrados = filtrados.filter((i) => i.portal === portal);
    const tipo = url.searchParams.get("tipo");
    if (tipo) filtrados = filtrados.filter((i) => i.tipo === tipo);
    const operacion = url.searchParams.get("operacion");
    if (operacion) filtrados = filtrados.filter((i) => i.operacion === operacion);
    const anunciante = url.searchParams.get("anunciante");
    if (anunciante) filtrados = filtrados.filter((i) => i.anunciante === anunciante);
    const tel = url.searchParams.get("tel");
    if (tel === "1") filtrados = filtrados.filter((i) => i.tieneTelefono);
    const precioMin = url.searchParams.get("precioMin");
    if (precioMin) filtrados = filtrados.filter((i) => i.precio >= Number(precioMin));
    const precioMax = url.searchParams.get("precioMax");
    if (precioMax) filtrados = filtrados.filter((i) => i.precio <= Number(precioMax));
    const m2min = url.searchParams.get("m2min");
    if (m2min) filtrados = filtrados.filter((i) => (i.m2 ?? 0) >= Number(m2min));
    const scoreMin = url.searchParams.get("min");
    if (scoreMin) filtrados = filtrados.filter((i) => i.score >= Number(scoreMin));
    const orden = url.searchParams.get("orden") ?? "";
    if (!ORDEN_VALIDOS.has(orden)) return envia(res, 400, { error: "orden inválido" });
    if (orden) {
      const desc = orden.startsWith("-");
      const clave = desc ? orden.slice(1) : orden;
      filtrados = [...filtrados].sort((a, b) => {
        const av = a[clave] ?? 0;
        const bv = b[clave] ?? 0;
        return desc ? (av < bv ? 1 : -1) : av > bv ? 1 : -1;
      });
    }
    return envia(res, 200, { total: filtrados.length, cursor: null, items: filtrados });
  }

  const matchFicha = ruta.match(/^\/inmueble\/([^/]+)$/);
  if (matchFicha) {
    const id = decodeURIComponent(matchFicha[1]);
    const items = await itemsVivos();
    const fichas = await cargaFixture("fichas.json");
    const base = items.find((i) => i.id === id);
    if (!base || !fichas[id]) return envia(res, 404, { error: "no encontrado" });
    return envia(res, 200, { ...base, ...fichas[id] });
  }

  const matchContacto = ruta.match(/^\/inmueble\/([^/]+)\/contacto$/);
  if (matchContacto) {
    const id = decodeURIComponent(matchContacto[1]);
    const contactos = await cargaFixture("contactos.json");
    if (!contactos[id]) return envia(res, 404, { error: "sin contacto" });
    return envia(res, 200, contactos[id]);
  }

  const matchEstado = ruta.match(/^\/inmueble\/([^/]+)\/estado$/);
  if (matchEstado && req.method === "POST") {
    const id = decodeURIComponent(matchEstado[1]);
    const cuerpo = await leeJson(req);
    const valida = new Set(DISPOSICIONES_VALIDAS);
    const NECESITAN_RECORDATORIO = new Set(["no_contesta", "buzon", "rellamar"]);
    if (!valida.has(cuerpo.disposicion)) return envia(res, 400, { error: "disposición inválida" });
    if (NECESITAN_RECORDATORIO.has(cuerpo.disposicion) && !cuerpo.recordatorioAt) {
      return envia(res, 400, { error: "recordatorioAt requerido" });
    }
    const items = await itemsVivos();
    const item = items.find((i) => i.id === id);
    if (item) {
      item.disposicion = cuerpo.disposicion;
      item.etapa = ETAPA_POR_DISPOSICION[cuerpo.disposicion] ?? item.etapa;
      if (cuerpo.recordatorioAt) item.recordatorioAt = cuerpo.recordatorioAt;
    }
    return envia(res, 204, undefined);
  }

  const matchAsignar = ruta.match(/^\/inmueble\/([^/]+)\/asignar$/);
  if (matchAsignar && req.method === "POST") {
    await leeJson(req);
    return envia(res, 204, undefined);
  }

  if (ruta === "/kpis") {
    const items = await itemsVivos();
    const porEtapa = {};
    for (const i of items) porEtapa[i.etapa] = (porEtapa[i.etapa] ?? 0) + 1;
    return envia(res, 200, {
      nuevosHoy: items.filter((i) => i.etapa === "novedad").length,
      conTelefono: items.filter((i) => i.tieneTelefono).length,
      bajadas7d: items.filter((i) => i.variacionPct !== null && i.variacionPct < 0).length,
      porEtapa,
      recordatoriosHoy: items.filter((i) => i.recordatorioAt).length,
      crmPendientes: items.filter((i) => i.crmEstado === "pendiente").length,
      crmFallos: items.filter((i) => i.crmEstado === "error").length,
      actualizadoAt: AHORA_FIJA,
    });
  }

  const matchOdoo = ruta.match(/^\/inmueble\/([^/]+)\/odoo$/);
  if (matchOdoo && req.method === "POST") {
    return envia(res, 200, { ok: true, estado: "ok" });
  }

  if (ruta === "/facetas") return envia(res, 200, await cargaFixture("facetas.json"));

  if (ruta === "/export.csv") {
    const items = await cargaFixture("items.json");
    const cab = "id,portal,titulo,municipio,precio,etapa\n";
    const filas = items.map((i) => `${i.id},${i.portal},"${i.titulo}",${i.municipio},${i.precio},${i.etapa}`).join("\n");
    res.writeHead(200, { "Content-Type": "text/csv", "Access-Control-Allow-Origin": "*" });
    return res.end(cab + filas + "\n");
  }

  return envia(res, 404, { error: "no encontrado" });
}

async function leeJson(req) {
  const trozos = [];
  for await (const trozo of req) trozos.push(trozo);
  const texto = Buffer.concat(trozos).toString("utf-8");
  return texto ? JSON.parse(texto) : {};
}

createServer((req, res) => {
  manejador(req, res).catch((err) => {
    console.error(err);
    envia(res, 500, { error: "error interno mock" });
  });
}).listen(PUERTO, () => {
  console.log(`mock /api/v1 en http://localhost:${PUERTO}`);
});
