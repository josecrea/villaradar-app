// Comprueba el presupuesto de JS del build (gzip).
// Presupuesto total: 150 kB gz. Sub-límite del shell (todo menos el chunk de Leaflet): 60 kB gz.
// El chunk de Leaflet (mapa.ts hace `await import("leaflet")`, Vite lo separa en su propio
// fichero) se reporta aparte y NO cuenta contra el sub-límite del shell, pero SÍ cuenta
// contra el total de 150 kB.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const DIST = "dist";
const LIMITE_TOTAL = 150 * 1024;
const LIMITE_SHELL = 60 * 1024;

function ficherosJs(dir) {
  const resultado = [];
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) {
      resultado.push(...ficherosJs(ruta));
    } else if (entrada.endsWith(".js")) {
      resultado.push(ruta);
    }
  }
  return resultado;
}

function esChunkDeLeaflet(ruta) {
  return /leaflet/i.test(ruta);
}

const ficheros = ficherosJs(DIST);
let totalShell = 0;
let totalLeaflet = 0;
const desgloseShell = [];
const desgloseLeaflet = [];

for (const fichero of ficheros) {
  const contenido = readFileSync(fichero);
  const gz = gzipSync(contenido).length;
  if (esChunkDeLeaflet(fichero)) {
    totalLeaflet += gz;
    desgloseLeaflet.push({ fichero, gz });
  } else {
    totalShell += gz;
    desgloseShell.push({ fichero, gz });
  }
}

const totalGeneral = totalShell + totalLeaflet;

console.log("--- Desglose shell (sin Leaflet) ---");
for (const { fichero, gz } of desgloseShell) {
  console.log(`${fichero}: ${(gz / 1024).toFixed(2)} kB gz`);
}
console.log(`SUBTOTAL shell: ${(totalShell / 1024).toFixed(2)} kB (límite ${LIMITE_SHELL / 1024} kB)`);

console.log("--- Desglose Leaflet (chunk aparte) ---");
if (desgloseLeaflet.length === 0) {
  console.log("(sin chunk de Leaflet en este build)");
}
for (const { fichero, gz } of desgloseLeaflet) {
  console.log(`${fichero}: ${(gz / 1024).toFixed(2)} kB gz`);
}
console.log(`SUBTOTAL Leaflet: ${(totalLeaflet / 1024).toFixed(2)} kB`);

console.log(`TOTAL JS gzip: ${(totalGeneral / 1024).toFixed(2)} kB (límite ${LIMITE_TOTAL / 1024} kB)`);

let fallo = false;
if (totalShell > LIMITE_SHELL) {
  console.error(
    `FALLO: shell supera su sub-límite (${(totalShell / 1024).toFixed(2)} kB > ${LIMITE_SHELL / 1024} kB)`,
  );
  fallo = true;
}
if (totalGeneral > LIMITE_TOTAL) {
  console.error(
    `FALLO: presupuesto total de JS superado (${(totalGeneral / 1024).toFixed(2)} kB > ${LIMITE_TOTAL / 1024} kB)`,
  );
  fallo = true;
}

if (fallo) {
  process.exit(1);
}

console.log("OK: dentro de presupuesto (150 kB total / 60 kB shell)");
