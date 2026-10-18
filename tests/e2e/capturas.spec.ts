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
}

test("captura de pantalla con datos cargados", async ({ page }, testInfo) => {
  await entraYLogin(page);
  await page.waitForTimeout(100);
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

  await page.waitForTimeout(200);
  const siguenEnOrigen = await primeraColumna.locator(".titulo-kanban", { hasText: titulo ?? "" }).count();
  expect(siguenEnOrigen).toBe(0);
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

test("dev: hay al menos una hoja de estilos cargada (CSP no la bloquea)", async ({ page }) => {
  await entraYLogin(page);
  const hojas = await page.evaluate(() => document.styleSheets.length);
  expect(hojas).toBeGreaterThanOrEqual(1);
});
