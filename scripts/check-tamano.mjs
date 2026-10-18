// Presupuesto de JS: 150 kB gz total; sub-límite del shell (todo menos el
// chunk de Leaflet, que se separa e informa aparte) <= 60 kB gz.
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

const ficheros = ficherosJs(DIST);
let totalShell = 0;
let totalLeaflet = 0;

for (const fichero of ficheros) {
  const contenido = readFileSync(fichero);
  const gz = gzipSync(contenido).length;
  const esLeaflet = /leaflet/i.test(fichero);
  if (esLeaflet) {
    totalLeaflet += gz;
  } else {
    totalShell += gz;
  }
  console.log(`${fichero}: ${(gz / 1024).toFixed(2)} kB gz${esLeaflet ? " (leaflet, aparte)" : ""}`);
}

const total = totalShell + totalLeaflet;
console.log(`TOTAL JS gzip: ${(total / 1024).toFixed(2)} kB (límite ${LIMITE_TOTAL / 1024} kB)`);
console.log(`  shell: ${(totalShell / 1024).toFixed(2)} kB (límite ${LIMITE_SHELL / 1024} kB)`);
console.log(`  leaflet: ${(totalLeaflet / 1024).toFixed(2)} kB (chunk aparte, bajo demanda)`);

let fallo = false;
if (total > LIMITE_TOTAL) {
  console.error(`FALLO: presupuesto TOTAL superado (${(total / 1024).toFixed(2)} > ${LIMITE_TOTAL / 1024} kB)`);
  fallo = true;
}
if (totalShell > LIMITE_SHELL) {
  console.error(`FALLO: presupuesto del SHELL superado (${(totalShell / 1024).toFixed(2)} > ${LIMITE_SHELL / 1024} kB)`);
  fallo = true;
}

if (fallo) process.exit(1);
