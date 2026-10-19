import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function entraYLogin(page: import("@playwright/test").Page) {
  await page.goto("/#/captacion");
  await page.getByLabel("Usuario").fill("jose");
  await page.getByLabel("Contraseña").fill("lo-que-sea");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator(".franja-mando")).toBeVisible();
  // Desactiva animaciones y el parpadeo del cursor para capturas deterministas.
  await page.addStyleTag({
    content: "*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }",
  });
  // Espera a que cada <img class="foto"> VISIBLE esté resuelta (cargada o ya
  // sustituida por su fallback de iniciales tras el evento "error"); nunca un
  // timeout a ciegas, porque eso es justo lo que producía capturas no
  // deterministas (GRAVE 3). Las fotos de la lista de tarjetas siguen en el
  // DOM con loading=lazy aunque estén ocultas por CSS en ≥768px (la tabla es
  // la que se ve ahí); un elemento con display:none nunca dispara la carga
  // perezosa, así que solo se exige a las que tienen layout real.
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll<HTMLImageElement>("img.foto"))
      .filter((img) => img.offsetParent !== null)
      .every((img) => img.complete),
  );
}

async function abreMapaYEsperaTeselas(page: import("@playwright/test").Page): Promise<void> {
  await page.locator(".boton-abrir-mapa").click();
  await page.waitForFunction(() => {
    const teselas = Array.from(document.querySelectorAll<HTMLImageElement>("#mapa-leaflet img.leaflet-tile"));
    if (teselas.length === 0) return false;
    return teselas.every((t) => t.complete && t.naturalWidth > 0);
  });
  await page.waitForFunction(() => document.querySelectorAll("#mapa-leaflet .leaflet-marker-icon").length > 0);
  // Dos frames de composición para que el navegador termine de pintar antes
  // de capturar (determinista: ligado a rAF, no a un tiempo arbitrario).
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  );
}

test("captura de pantalla con datos cargados", async ({ page }, testInfo) => {
  await entraYLogin(page);
  // En 1440 se abre el mapa antes de capturar para mostrar los pines y las
  // teselas (deterministas: las sirve el propio mock, ver mock/servidor.mjs).
  if (testInfo.project.name === "1440") {
    await abreMapaYEsperaTeselas(page);
  }
  await page.screenshot({ path: `docs/capturas/captacion-${testInfo.project.name}.png`, fullPage: true });
});

test("sin desbordamiento horizontal con datos cargados", async ({ page }, testInfo) => {
  await entraYLogin(page);
  const ancho = Number(testInfo.project.name);
  if (Number.isNaN(ancho)) return;
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, `scrollWidth=${scrollWidth} clientWidth=${clientWidth}`).toBeLessThanOrEqual(clientWidth);
});

test("franja de mando: ningún rótulo de KPI se solapa (320/390)", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "320" && testInfo.project.name !== "390", "solo aplica en móvil");
  await entraYLogin(page);
  const rects = await page.locator(".cifra-mando .etiqueta").evaluateAll((nodos) =>
    nodos.map((n) => n.getBoundingClientRect()).map((r) => ({ top: r.top, bottom: r.bottom, left: r.left, right: r.right })),
  );
  expect(rects.length).toBeGreaterThan(0);
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i];
      const b = rects[j];
      const solapan = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      expect(solapan, `rótulo ${i} y ${j} se solapan: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`).toBe(false);
    }
  }
  // Además, cada rótulo debe caber en su propia tarjeta sin desbordar.
  const desbordes = await page.locator(".cifra-mando").evaluateAll((nodos) =>
    nodos.filter((n) => n.scrollWidth > n.clientWidth + 1).length,
  );
  expect(desbordes).toBe(0);
});

test("kanban a 1440: ninguna tarjeta desborda su columna", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "1440", "el kanban solo se muestra en ≥1200px");
  await entraYLogin(page);
  const columnas = page.locator(".kanban-columna");
  const n = await columnas.count();
  for (let i = 0; i < n; i++) {
    const columna = columnas.nth(i);
    const anchoColumna = await columna.evaluate((c) => c.clientWidth);
    const desbordes = await columna
      .locator(".kanban-tarjeta")
      .evaluateAll((tarjetas, ancho) => tarjetas.filter((t) => t.scrollWidth > ancho + 1).map((t) => t.textContent), anchoColumna);
    expect(desbordes, JSON.stringify(desbordes)).toHaveLength(0);
  }
});

test("accesibilidad: 0 violaciones serious/critical", async ({ page }) => {
  await entraYLogin(page);
  const resultados = await new AxeBuilder({ page }).analyze();
  const graves = resultados.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(graves, JSON.stringify(graves, null, 2)).toHaveLength(0);
});

test("teclado: ordenar y abrir ficha sin ratón", async ({ page }, testInfo) => {
  await entraYLogin(page);
  const anchoMovil = testInfo.project.name === "320" || testInfo.project.name === "390";

  if (!anchoMovil) {
    const primeraCabecera = page.locator(".tabla-densa thead button").first();
    await primeraCabecera.focus();
    await expect(primeraCabecera).toBeFocused();
    await page.keyboard.press("Enter");
  }

  const primerBotonFila = anchoMovil
    ? page.locator(".titulo-tarjeta").first()
    : page.locator(".boton-fila").first();
  await primerBotonFila.focus();
  await expect(primerBotonFila).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".ficha h1")).toBeVisible();
});

test("kanban: «Mover a…» solo con teclado mueve la tarjeta", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "1440", "el kanban solo se muestra en ≥1200px");
  await entraYLogin(page);
  const primeraColumna = page.locator(".kanban-columna").first();
  const tarjeta = primeraColumna.locator(".kanban-tarjeta").first();
  const titulo = await tarjeta.locator(".titulo-kanban").textContent();
  const botonMover = tarjeta.locator(".boton-mover-a");
  await botonMover.focus();
  await expect(botonMover).toBeFocused();
  await page.keyboard.press("Enter");

  const dialogo = page.locator("dialog.dialogo-mover");
  await expect(dialogo).toBeVisible();
  const botonDestino = dialogo.locator("button").nth(2); // "en_espera", distinto de la columna origen
  await botonDestino.focus();
  await page.keyboard.press("Enter");
  await expect(dialogo).toBeHidden();

  // Reintenta hasta que el DOM refleje el movimiento (recarga tras el POST
  // al mock); nunca un tiempo fijo a ciegas.
  await expect(primeraColumna.locator(".titulo-kanban", { hasText: titulo ?? "" })).toHaveCount(0);
});

test("kanban: un arrastre que el servidor rechaza avisa y no mueve la tarjeta", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "1440", "el kanban solo se muestra en ≥1200px");
  await entraYLogin(page);

  // Simula un 400 real del backend (p. ej. Odoo caído o validación fallida)
  // interceptando SOLO la llamada de este test, sin tocar el mock.
  await page.route("**/inmueble/*/estado", (route) =>
    route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "simulado" }) }),
  );

  // No asume qué columna tiene tarjetas: el mock mantiene estado en memoria
  // entre tests del mismo proceso, así que un test anterior puede haber
  // movido la primera columna a 0 elementos.
  const primeraColumna = page.locator(".kanban-columna:has(.kanban-tarjeta)").first();
  const tarjeta = primeraColumna.locator(".kanban-tarjeta").first();
  const titulo = await tarjeta.locator(".titulo-kanban").textContent();
  const botonMover = tarjeta.locator(".boton-mover-a");
  await botonMover.focus();
  await page.keyboard.press("Enter");

  const dialogo = page.locator("dialog.dialogo-mover");
  await expect(dialogo).toBeVisible();
  // El destino da igual: el route interceptado rechaza el POST pase lo que pase.
  const botonDestino = dialogo.locator("button").first();
  await botonDestino.focus();
  await page.keyboard.press("Enter");

  // Aviso visible y accesible, y la tarjeta se queda en su columna de origen.
  await expect(page.locator(".aviso-flotante", { hasText: "No se pudo mover" })).toBeVisible();
  await expect(primeraColumna.locator(".titulo-kanban", { hasText: titulo ?? "" })).toHaveCount(1);
});

test("aplicar un filtro cambia la URL y el total", async ({ page }, testInfo) => {
  await entraYLogin(page);
  const totalInicial = await page.locator(".total-resultados").textContent();
  if (testInfo.project.name === "320" || testInfo.project.name === "390") {
    await page.locator(".boton-abrir-filtros").click();
    await page.locator('dialog.hoja-filtros select[name="etapa"]').selectOption("captado");
    await page.getByRole("button", { name: "Aplicar filtros" }).click();
  } else {
    await page.locator('select[name="etapa"]').selectOption("captado");
    await page.getByRole("button", { name: "Aplicar filtros" }).click();
  }
  await expect(page).toHaveURL(/etapa=captado/);
  await expect(page.locator(".total-resultados")).toHaveText("1 resultado");
  expect(await page.locator(".total-resultados").textContent()).not.toBe(totalInicial);
});

test("mock valida orden como la API: valor basura da 400", async ({ page }) => {
  await entraYLogin(page);
  const token = await page.evaluate(() => sessionStorage.getItem("vr.token"));
  const resp = await page.request.get("/api/v1/novedades?orden=basura", {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(resp.status()).toBe(400);
});

test("disposición inválida da 400 (el mock valida como la API real)", async ({ page }) => {
  await entraYLogin(page);
  const estado = await page.evaluate(async () => {
    const token = sessionStorage.getItem("vr.token");
    const resp = await fetch("/api/v1/inmueble/adeje-001/estado", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ disposicion: "etapa-invalida" }),
    });
    return resp.status;
  });
  expect(estado).toBe(400);
});

test("estado en la URL persiste tras recargar", async ({ page }) => {
  await entraYLogin(page);
  await page.evaluate(() => {
    location.hash = "/captacion?etapa=captado";
  });
  await page.waitForFunction(() => location.hash.includes("etapa=captado"));
  await page.reload();
  await expect(page).toHaveURL(/etapa=captado/);
});
