import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function entraYLogin(page: import("@playwright/test").Page) {
  await page.goto("/#/captacion");
  await page.getByLabel("Usuario").fill("jose");
  await page.getByLabel("Contraseña").fill("lo-que-sea");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator(".tabla-densa")).toBeVisible();
}

for (const [ancho, alto, nombre] of [
  [320, 640, "320"],
  [768, 1024, "768"],
  [1440, 900, "1440"],
] as const) {
  test(`captura ${nombre}px`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: alto });
    await entraYLogin(page);
    await page.screenshot({ path: `docs/capturas/captacion-${nombre}.png`, fullPage: true });
  });
}

test("accesibilidad: 0 violaciones serious/critical", async ({ page }) => {
  await entraYLogin(page);
  const resultados = await new AxeBuilder({ page }).analyze();
  const graves = resultados.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(graves, JSON.stringify(graves, null, 2)).toHaveLength(0);
});

test("teclado: ordenar y abrir ficha sin ratón", async ({ page }) => {
  await entraYLogin(page);
  const primeraCabecera = page.locator(".tabla-densa thead button").first();
  await primeraCabecera.focus();
  await expect(primeraCabecera).toBeFocused();
  await page.keyboard.press("Enter");

  const primerBotonFila = page.locator(".boton-fila").first();
  await primerBotonFila.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".ficha h1")).toBeVisible();
});

test("aplicar un filtro cambia la URL y el total", async ({ page }) => {
  await entraYLogin(page);
  const totalInicial = await page.locator(".total-resultados").textContent();
  await page.locator('select[name="etapa"]').selectOption("captado");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page).toHaveURL(/etapa=captado/);
  await expect(page.locator(".total-resultados")).toHaveText("1 resultado");
  expect(await page.locator(".total-resultados").textContent()).not.toBe(totalInicial);
});

test("disposición inválida da 400 (el mock valida como la API real)", async ({ page }) => {
  await entraYLogin(page);
  await page.locator(".boton-fila").first().click();
  await expect(page.locator(".ficha h1")).toBeVisible();
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
  await expect(page.locator(".tabla-densa")).toBeVisible();
});
