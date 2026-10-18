// Comprueba que el JS del build (gzip) no supere el presupuesto de 80 kB.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const DIST = "dist";
const LIMITE_BYTES = 80 * 1024;

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
let total = 0;
for (const fichero of ficheros) {
  const contenido = readFileSync(fichero);
  const gz = gzipSync(contenido);
  total += gz.length;
  console.log(`${fichero}: ${(gz.length / 1024).toFixed(2)} kB gz`);
}

console.log(`TOTAL JS gzip: ${(total / 1024).toFixed(2)} kB (límite ${LIMITE_BYTES / 1024} kB)`);

if (total > LIMITE_BYTES) {
  console.error("FALLO: presupuesto de JS superado");
  process.exit(1);
}
