import { test } from "node:test";
import assert from "node:assert/strict";
import { nodoPopup } from "../../src/vistas/popup.ts";

// DOM mínimo: lo que importa es que el título solo llegue por textContent
// (nunca innerHTML) y que se devuelva un nodo, no un string.
function docFalso() {
  const creados: Array<{ tag: string; textContent: string; innerHTML?: string }> = [];
  return {
    creados,
    doc: {
      createElement(tag: string) {
        const el = {
          tag,
          textContent: "",
          set innerHTML(_v: string) {
            throw new Error("innerHTML prohibido");
          },
        };
        creados.push(el as never);
        return el;
      },
    } as unknown as Document,
  };
}

test("el título con HTML va como texto, en un nodo (no string)", () => {
  const { doc, creados } = docFalso();
  const malo = '<img src=x onerror=alert(1)><a href="https://phishing">pulsa</a>';
  const nodo = nodoPopup(malo, doc) as unknown as { textContent: string };
  assert.equal(typeof nodo, "object");
  assert.equal(nodo.textContent, malo);
  assert.equal(creados.length, 1);
});

test("mapa.ts no pasa strings a bindPopup ni usa innerHTML", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../../src/vistas/mapa.ts", import.meta.url), "utf8");
  assert.ok(!/bindPopup\(\s*item\.titulo\s*\)/.test(src));
  assert.ok(/bindPopup\(nodoPopup\(/.test(src));
  assert.ok(!/innerHTML/.test(src));
});
