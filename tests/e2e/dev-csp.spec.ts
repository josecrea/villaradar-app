// Guarda específica del hallazgo medido (notes.md): la CSP vieja no declaraba
// style-src y heredaba default-src 'self', que bloqueaba el <style> que Vite
// inyecta en `npm run dev` → la app salía SIN ESTILOS. Esto SOLO se puede
// comprobar contra el servidor de desarrollo real (no contra `vite preview`,
// que sirve CSS como <link> estático y pasaría igual con la CSP vieja).
import { test, expect } from "@playwright/test";

test("dev real: hay al menos una hoja de estilos (la CSP no la bloquea)", async ({ page }) => {
  await page.goto("/villaradar-app/");
  const hojas = await page.evaluate(() => document.styleSheets.length);
  expect(hojas).toBeGreaterThanOrEqual(1);

  // Si la CSP bloqueara el <style> de Vite, la fuente caería al stack por
  // defecto del navegador (serif/Times); con tokens.css cargado debe ser la
  // fuente de sistema sans-serif declarada en --fuente-texto.
  const fuente = await page.evaluate(() => getComputedStyle(document.body).fontFamily.toLowerCase());
  expect(fuente).toContain("system-ui");
});
