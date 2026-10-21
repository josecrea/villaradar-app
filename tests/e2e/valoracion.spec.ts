import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";

const URL_MINI_APP = "https://valoracion.zohmip.easypanel.host";
// Nunca un importe o unos días a cero: un dato ausente es «n/d» (ni «0 €», ni «0 días»).
const CERO_EURO = /(^|[^\d.,])0\s?€|€\s?0(?![\d.,])/;

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const fixtureBase = (): Json => JSON.parse(readFileSync("mock/fixtures/valoracion.json", "utf-8"));

/** Sirve una respuesta de /valoracion distinta de la fixture (variantes de datos). */
async function sirve(page: Page, cambia: (v: Json) => void): Promise<void> {
  const v = fixtureBase();
  cambia(v);
  await page.route("**/valoracion", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(v) })
      : route.continue(),
  );
}

async function calcula(page: Page): Promise<void> {
  await entra(page, "#/valoracion");
  await rellena(page);
  await page.getByRole("button", { name: "Calcular" }).click();
  await expect(page.locator(".valoracion-previa h2")).toBeVisible();
}

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

test("v2: cuatro cifras, tabla de zona, testigos, serie y límites (sin ceros inventados)", async ({ page }) => {
  await calcula(page);
  const previa = page.locator(".valoracion-previa");
  await expect(previa).toContainText("Fuera de mercado");
  await expect(previa).toContainText("más de 365.000 €");

  const zona = previa.locator(".tabla-zona");
  await expect(zona.locator("thead th[scope='col']")).toHaveCount(6);
  await expect(zona.locator("tbody tr")).toHaveCount(2);
  await expect(zona.locator("tbody tr").first()).toContainText("salida recomendada");
  await expect(zona.locator("tbody tr").first()).toContainText("n/a");
  await expect(zona.locator("tbody tr").nth(1)).toContainText("Mediana de 12 comparables");
  await expect(previa).toContainText("la diferencia no aplica");

  const testigos = previa.locator(".tabla-testigos");
  await expect(testigos.locator("thead th")).toHaveCount(9);
  await expect(testigos.locator("thead")).toContainText("Estado");
  await expect(testigos.locator("thead")).toContainText("Días");
  await expect(testigos.locator("tbody tr").first()).toContainText("al menos 21");
  await expect(testigos.locator("tbody tr").nth(1)).toContainText("n/d");
  // B6: sin vigencia no hay «activo» ni «inactivo» en ninguna celda.
  await expect(testigos.locator("tbody")).not.toContainText(/activo/i);

  const serie = previa.locator(".tabla-serie");
  await expect(serie.locator("tbody tr")).toHaveCount(4);
  await expect(serie.locator("tbody tr").nth(1)).toContainText("n/d"); // ago: n = 0, sin €/m²
  await expect(serie.locator("tbody tr").last()).toContainText("hasta el 20/10/2026");
  await expect(serie.locator("tbody tr").last()).toContainText("+2,2 %");

  await expect(previa.getByRole("note")).toHaveCount(5);
  await expect(previa).toContainText("Inventario por tamaño (nuevos, retirados, % de actividad): no se publica.");
  await expect(previa).toContainText("Solo hay 3 anuncios comparables en la zona");
  expect(await previa.innerText()).not.toMatch(CERO_EURO);
  await expect(previa.locator("table")).toHaveCount(3);
});

test("v2: año y zona de Catastro solo si hay Catastro; null se pinta n/d", async ({ page }) => {
  await sirve(page, (v) => {
    v.superficie.catastro = "ok";
    v.superficie.m2Catastro = 80;
    v.superficie.desviacionPct = 16.3;
    v.superficie.anioConstruccion = null;
    v.superficie.zonaCatastro = null;
  });
  await calcula(page);
  const sup = page.locator(".valoracion-previa").locator("section", { hasText: "Superficie" }).first();
  await expect(sup.locator("dt", { hasText: "Año de construcción" })).toBeVisible();
  await expect(sup.locator("dt", { hasText: "Año de construcción" }).locator("xpath=following-sibling::dd[1]")).toHaveText("n/d");
  await expect(sup.locator("dt", { hasText: "Zona según Catastro" }).locator("xpath=following-sibling::dd[1]")).toHaveText("n/d");
});

test("v2: con Catastro y datos, año y zona se muestran; sin Catastro no hay filas", async ({ page }) => {
  await sirve(page, (v) => {
    v.superficie.catastro = "ok";
    v.superficie.anioConstruccion = 1975;
    v.superficie.zonaCatastro = "Costa Silencio";
  });
  await calcula(page);
  const previa = page.locator(".valoracion-previa");
  await expect(previa.locator("dt", { hasText: "Año de construcción" }).locator("xpath=following-sibling::dd[1]")).toHaveText("1975");
  await expect(previa.locator("dt", { hasText: "Zona según Catastro" }).locator("xpath=following-sibling::dd[1]")).toHaveText("Costa Silencio");
});

test("v2: sin Catastro (fixture por defecto) no se pintan año ni zona de Catastro", async ({ page }) => {
  await calcula(page);
  await expect(page.locator(".valoracion-previa")).not.toContainText("Año de construcción");
  await expect(page.locator(".valoracion-previa")).not.toContainText("Zona según Catastro");
});

test("v2: con precio del propietario la diferencia es numérica; hab/baños null → n/d", async ({ page }) => {
  await sirve(page, (v) => {
    v.tablaZona.inmueble.origenPrecio = "precio_propietario";
    v.tablaZona.inmueble.precio = 340000;
    v.tablaZona.inmueble.eurM2 = 3656;
    v.tablaZona.inmueble.hab = null;
    v.tablaZona.comparablesP50.banos = null;
    v.tablaZona.difEurM2Pct = 13.5;
  });
  await calcula(page);
  const zona = page.locator(".valoracion-previa .tabla-zona");
  const fila1 = zona.locator("tbody tr").first();
  await expect(fila1).toContainText("precio pedido");
  await expect(fila1).toContainText("+13,5 %");
  await expect(fila1).not.toContainText("n/a");
  await expect(fila1).toContainText("n/d"); // hab null
  await expect(zona.locator("tbody tr").nth(1)).toContainText("n/d"); // baños null
  await expect(page.locator(".valoracion-previa")).not.toContainText("la diferencia no aplica");
});

test("v2: abstención = sin cifra, sin tablas de zona ni serie, sin ceros", async ({ page }) => {
  await sirve(page, (v) => {
    v.propuesta = { abstencion: true, motivo: "sin_evidencia", ventaRapida: null, salida: null, techo: null, fueraDeMercado: null, posicionPropietario: null };
    v.tablaZona = null;
    v.serie = null;
    v.testigos = [];
    v.escriturado = null;
    v.anuncios.eurM2 = null;
    v.anuncios.valor = null;
    v.anuncios.n = 0;
    v.limites = v.limites.filter((l: Json) => l.codigo === "inventario_no_disponible");
  });
  await calcula(page);
  const previa = page.locator(".valoracion-previa");
  await expect(previa).toContainText("Sin cifra");
  await expect(previa.locator("table")).toHaveCount(0);
  await expect(previa.getByRole("note")).toHaveCount(1);
  expect(await previa.innerText()).not.toMatch(CERO_EURO);
});

test("v2: solo escriturado = una cifra y n/d en las demás (nunca 0 €)", async ({ page }) => {
  await sirve(page, (v) => {
    v.propuesta = { abstencion: false, motivo: "solo_escriturado", ventaRapida: 293000, salida: null, techo: null, fueraDeMercado: null, posicionPropietario: null };
    v.tablaZona = null;
  });
  await calcula(page);
  const cifras = page.locator(".valoracion-previa").locator("section", { hasText: "Propuesta de precio" });
  await expect(cifras).toContainText("293.000 €");
  await expect(cifras).not.toContainText("Sin cifra");
  await expect(cifras.locator("dd", { hasText: /^n\/d$/ })).toHaveCount(3);
  expect(await cifras.innerText()).not.toMatch(CERO_EURO);
});

test("v2: sin overflow horizontal con la vista previa completa", async ({ page }) => {
  await calcula(page);
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, `scrollWidth=${scrollWidth} clientWidth=${clientWidth}`).toBeLessThanOrEqual(clientWidth);
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
