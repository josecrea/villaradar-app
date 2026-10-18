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

async function manejador(req, res) {
  const url = new URL(req.url, `http://localhost:${PUERTO}`);
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
    const items = await cargaFixture("items.json");
    let filtrados = items;
    const etapa = url.searchParams.get("etapa");
    if (etapa) filtrados = filtrados.filter((i) => i.etapa === etapa);
    const municipio = url.searchParams.get("zona");
    if (municipio) filtrados = filtrados.filter((i) => i.municipio.toLowerCase().includes(municipio.toLowerCase()));
    const precioMin = url.searchParams.get("precioMin") ?? url.searchParams.get("min");
    if (precioMin) filtrados = filtrados.filter((i) => i.precio >= Number(precioMin));
    return envia(res, 200, { total: filtrados.length, cursor: null, items: filtrados });
  }

  const matchFicha = ruta.match(/^\/inmueble\/([^/]+)$/);
  if (matchFicha) {
    const id = decodeURIComponent(matchFicha[1]);
    const items = await cargaFixture("items.json");
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
    await leeJson(req);
    return envia(res, 204, undefined);
  }

  const matchAsignar = ruta.match(/^\/inmueble\/([^/]+)\/asignar$/);
  if (matchAsignar && req.method === "POST") {
    await leeJson(req);
    return envia(res, 204, undefined);
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
