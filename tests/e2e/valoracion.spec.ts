import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const URL_MINI_APP = "https://valoracion.zohmip.easypanel.host";

async function entra(page: Page, hash: string): Promise<void> {
  await page.goto(`/${hash}`);
  await page.getByLabel("Usuario").fill("jose");
  await page.getByLabel("Contraseña").fill("lo-que-sea");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.addStyleTag({
    content: "*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }",
  });
}

async function rellena(page: Page): Promise<void> {
  await page.getByLabel("Dirección").fill("Calle de ejemplo 1");
  await page.getByLabel("Código postal").fill("38639");
  await page.getByLabel("Municipio").fill("San Miguel de Abona");
  await page.getByLabel("Superficie (m²)").fill("93");
  await page.getByLabel("Habitaciones").fill("2");
  await page.getByLabel("Baños").fill("1");
}

test("enviar vacío muestra errores y no hace ninguna petición a /valoracion", async ({ page }) => {
  const peticiones: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/v1/valoracion")) peticiones.push(r.url());
  });
  await entra(page, "#/valoracion");
  await page.getByRole("button", { name: "Calcular" }).click();
  const direccion = page.getByLabel("Dirección");
  await expect(direccion).toHaveAttribute("aria-invalid", "true");
  await expect(direccion).toHaveAttribute("aria-describedby", "vf-direccion-error");
  await expect(page.locator("#vf-direccion-error")).toBeVisible();
  await expect(page.locator("#vf-cp-error")).toBeVisible();
  await expect(page.locator("#vf-m2-error")).toBeVisible();
  expect(peticiones).toHaveLength(0);
});

test("calcular muestra la propuesta y el texto del aviso", async ({ page }) => {
  await entra(page, "#/valoracion");
  await rellena(page);
  await page.getByRole("button", { name: "Calcular" }).click();
  const previa = page.locator(".valoracion-previa");
  await expect(previa).toContainText("299.000");
  await expect(previa).toContainText("No se indicó referencia catastral");
  await expect(previa.locator(".tabla-testigos tbody tr")).toHaveCount(3);
});

test("descargar PDF: nombre, cabecera application/pdf y contenido %PDF", async ({ page }) => {
  await entra(page, "#/valoracion");
  await rellena(page);
  await page.getByRole("button", { name: "Calcular" }).click();
  const boton = page.getByRole("button", { name: "Descargar PDF" });
  await expect(boton).toBeVisible();
  const [descarga, respuesta] = await Promise.all([
    page.waitForEvent("download"),
    page.waitForResponse((r) => r.url().endsWith("/valoracion/pdf")),
    boton.click(),
  ]);
  expect(descarga.suggestedFilename()).toMatch(/^valoracion-38639-\d{4}-\d{2}-\d{2}\.pdf$/);
  expect(respuesta.headers()["content-type"]).toContain("application/pdf");
  const ruta = await descarga.path();
  const { readFileSync } = await import("node:fs");
  expect(readFileSync(ruta).subarray(0, 4).toString("latin1")).toBe("%PDF");
});

test("un 400 de la API marca los campos que indica", async ({ page }) => {
  await entra(page, "#/valoracion");
  await rellena(page);
  await page.route("**/valoracion", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: "entrada inválida", campos: ["cp"] }),
    }),
  );
  await page.getByRole("button", { name: "Calcular" }).click();
  await expect(page.getByLabel("Código postal")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("alert").filter({ hasText: "Revisa los campos" })).toBeVisible();
});

test("un 401 al descargar el PDF devuelve al login y borra la sesión", async ({ page }) => {
  await entra(page, "#/valoracion");
  await rellena(page);
  await page.getByRole("button", { name: "Calcular" }).click();
  const boton = page.getByRole("button", { name: "Descargar PDF" });
  await expect(boton).toBeVisible();
  await page.route("**/valoracion/pdf", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "credenciales" }) }),
  );
  await boton.click();
  await expect(page.getByLabel("Usuario")).toBeVisible();
  expect(await page.evaluate(() => [sessionStorage.getItem("vr.token"), sessionStorage.getItem("vr.sesion")])).toEqual([null, null]);
});

test("un 401 al calcular devuelve al login y borra la sesión", async ({ page }) => {
  await entra(page, "#/valoracion");
  await rellena(page);
  await page.route("**/valoracion", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "credenciales" }) }),
  );
  await page.getByRole("button", { name: "Calcular" }).click();
  await expect(page.getByLabel("Usuario")).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("vr.sesion"))).toBeNull();
});

for (const [escrito, esperado] of [
  ["93,5", 93.5],
  ["93.5", 93.5],
] as const) {
  test(`m² decimales: «${escrito}» se envía como ${esperado}`, async ({ page }) => {
    await entra(page, "#/valoracion");
    await rellena(page);
    await page.getByLabel("Superficie (m²)").fill(escrito);
    const [peticion] = await Promise.all([
      page.waitForRequest((r) => r.url().endsWith("/valoracion") && r.method() === "POST"),
      page.getByRole("button", { name: "Calcular" }).click(),
    ]);
    expect(peticion.postDataJSON().m2).toBe(esperado);
    await expect(page.locator(".valoracion-previa")).toContainText("299.000");
  });
}

test("m² con texto no numérico se rechaza en el cliente con mensaje claro", async ({ page }) => {
  await entra(page, "#/valoracion");
  await rellena(page);
  await page.getByLabel("Superficie (m²)").fill("9x");
  await page.getByRole("button", { name: "Calcular" }).click();
  await expect(page.locator("#vf-m2-error")).toContainText("entre 10 y 10000");
});

test("la vista previa no usa aria-live y el foco va al encabezado", async ({ page }) => {
  await entra(page, "#/valoracion");
  await rellena(page);
  await page.getByRole("button", { name: "Calcular" }).click();
  await expect(page.locator(".valoracion-previa")).toContainText("299.000");
  await expect(page.locator(".valoracion-previa")).not.toHaveAttribute("aria-live", /.+/);
  await expect(page.getByRole("heading", { name: "Vista previa" })).toBeFocused();
});

test("desde una ficha, el botón lleva a la valoración con datos precargados", async ({ page }, testInfo) => {
  await entra(page, "#/captacion");
  await expect(page.locator(".franja-mando")).toBeVisible();
  const anchoMovil = testInfo.project.name === "320" || testInfo.project.name === "390";
  const abrir = anchoMovil ? page.locator(".titulo-tarjeta").first() : page.locator(".boton-fila").first();
  await abrir.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".ficha h1")).toBeVisible();
  await page.getByRole("button", { name: "Informe de valoración" }).click();
  await expect(page).toHaveURL(/#\/valoracion\?listing=/);
  await expect(page.getByLabel("Superficie (m²)")).not.toHaveValue("");
  await expect(page.getByLabel("Habitaciones")).not.toHaveValue("");
  await expect(page.getByLabel("Municipio")).not.toHaveValue("");
});

test("menú: Valoración es nativa y Radar 2x1 abre la Mini App en pestaña nueva", async ({ page }) => {
  await entra(page, "#/captacion");
  const nav = page.getByRole("navigation", { name: "Módulos de VillaRadar" });
  await expect(nav.getByRole("link", { name: "Valoración" })).toHaveAttribute("href", "#/valoracion");
  const radar = nav.getByRole("link", { name: "Radar 2x1" });
  await expect(radar).toHaveAttribute("target", "_blank");
  await expect(radar).toHaveAttribute("href", URL_MINI_APP);
});

test("accesibilidad, sin desbordes y captura con la vista previa", async ({ page }, testInfo) => {
  await entra(page, "#/valoracion");
  await rellena(page);
  await page.getByRole("button", { name: "Calcular" }).click();
  await expect(page.locator(".valoracion-previa")).toContainText("299.000");

  const resultados = await new AxeBuilder({ page }).analyze();
  const graves = resultados.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(graves, JSON.stringify(graves, null, 2)).toHaveLength(0);

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, `scrollWidth=${scrollWidth} clientWidth=${clientWidth}`).toBeLessThanOrEqual(clientWidth);

  // Sin ratón sobre ningún campo: el :hover cambiaría píxeles entre pasadas.
  await page.mouse.move(0, 0);
  await page.screenshot({ path: `docs/capturas/valoracion-${testInfo.project.name}.png`, fullPage: true });
});
