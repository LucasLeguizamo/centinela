/**
 * Prueba de humo de la landing. La corre quien vaya a mostrarla, antes de
 * mostrarla.
 *
 *   pnpm build && pnpm start -p 3210 &
 *   pnpm humo
 *
 * No valida diseño: valida que la página no se rompa delante del jurado. Lo
 * que revisa es exactamente lo que da vergüenza en vivo — un error en consola,
 * una sección que no cargó, un botón del chat que no responde, o el número de
 * acopios distinto al que dice el bot.
 *
 * ponytail: Playwright a pelo, sin runner. Si algún día hay diez pantallas que
 * probar, ahí sí entra `@playwright/test`.
 */

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PUNTOS, TOTAL_ACOPIOS, TOTAL_MUNICIPIOS } from "../lib/puntos.ts";
import { CONTEOS, MAS_GRANDE, MAS_SIGNIFICATIVO, SEIS_MAS } from "../lib/mundo.ts";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const URL = process.env.URL ?? "http://localhost:3210/";
const CAPTURAS = join(RAIZ, ".capturas");

const fallos = [];
const ok = (nombre) => console.log(`  ✅ ${nombre}`);
const revisar = (nombre, condicion, detalle = "") => {
  if (condicion) return ok(nombre);
  fallos.push(`${nombre}${detalle ? ` — ${detalle}` : ""}`);
  console.log(`  ❌ ${nombre}${detalle ? ` — ${detalle}` : ""}`);
};

mkdirSync(CAPTURAS, { recursive: true });

const navegador = await chromium.launch({ channel: "chrome" });

/* ------------------------------------------------------------------ escritorio */

console.log(`\nEscritorio · ${URL}`);
const escritorio = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
const pagina = await escritorio.newPage();

// Un error de consola en producción es un componente que no montó. Se recogen
// antes de navegar para no perderse los del arranque.
const errores = [];
pagina.on("console", (m) => m.type() === "error" && errores.push(m.text()));
pagina.on("pageerror", (e) => errores.push(String(e)));

const respuesta = await pagina.goto(URL, { waitUntil: "networkidle" });
revisar("responde 200", respuesta?.status() === 200, `status ${respuesta?.status()}`);

/**
 * Recorrer la página entera antes de mirar nada.
 *
 * Casi todo entra con `whileInView`: quieto en el tope, el resto del sitio
 * está a `opacity: 0` y una captura de página completa sale en blanco. Bajar
 * de a una pantalla no es cosmética — es lo que prueba que cada sección
 * despierta cuando le toca, que es justo lo que se rompe cuando alguien mueve
 * un margen del viewport.
 */
const recorrer = async (p) => {
  const alto = await p.evaluate(() => window.innerHeight);
  const total = await p.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < total; y += alto * 0.8) {
    await p.evaluate((y) => window.scrollTo(0, y), y);
    await p.waitForTimeout(220);
  }
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(400);
};
await recorrer(pagina);

// Ya recorrida, nada puede haber quedado invisible.
const invisibles = await pagina.evaluate(() =>
  [...document.querySelectorAll("section .encabezado, .capacidad, .cifra, .circuito")]
    .filter((el) => Number(getComputedStyle(el).opacity) < 0.9).length
);
revisar("todas las secciones se revelaron", invisibles === 0, `${invisibles} bloques invisibles`);

// Las ocho secciones del argumento. Si falta una, el orden del relato se rompió.
for (const id of ["problema", "demo", "ayuda", "como", "que-hace", "numeros", "pruebalo"]) {
  revisar(`sección #${id}`, await pagina.locator(`#${id}`).count() > 0);
}

// El titular es la tesis entera: si se anima mal, queda vacío y nadie lo nota
// hasta que el jurado está mirando.
const titular = (await pagina.locator("h1").innerText()).replace(/\s+/g, " ").trim();
revisar("titular completo", titular === "Los Android sonaron. Los iPhone no.", `leyó «${titular}»`);

// La página no puede decir un número que el bot no respalde.
const cuerpo = await pagina.locator("body").innerText();
revisar(
  `dice ${TOTAL_ACOPIOS} acopios en ${TOTAL_MUNICIPIOS} municipios`,
  cuerpo.includes(String(TOTAL_ACOPIOS)) && cuerpo.includes(String(TOTAL_MUNICIPIOS))
);
revisar("el mapa pintó los municipios", await pagina.locator(".mapa-punto, [class*='punto']").count() >= PUNTOS.length / 2);

// Español colombiano: el voseo se coló una vez, no se cuela dos.
const voseo = cuerpo.match(/\b(vos|tenés|querés|necesitás|recibís|elegís|escribís|decís|vivís|probalo|tuyo)\b/i);
revisar("sin voseo", !voseo, voseo?.[0]);

// El CTA es el único punto donde la demo sale de la página.
const wa = pagina.locator('a[href*="wa.me"]');
revisar("botones a WhatsApp", await wa.count() >= 3, `${await wa.count()} enlaces`);
revisar("abren en pestaña nueva", await wa.first().getAttribute("target") === "_blank");

// El menú de ayuda es interactivo a propósito: el jurado lo va a tocar.
await pagina.locator("#ayuda").scrollIntoViewIfNeeded();
await pagina.getByRole("button", { name: "Quiero ayudar" }).click();
await pagina.getByRole("button", { name: /Llevar cosas/ }).click();
const chat = await pagina.locator(".wa-hilo").innerText();
revisar("el chat responde con una dirección", chat.includes("Punto de Solidaridad Quibdó"));

await pagina.locator(".wa-reiniciar").click();
revisar("reiniciar deja el chat en el saludo", (await pagina.locator(".wa-hilo").innerText()).includes("Soy Centinela"));

await pagina.screenshot({ path: join(CAPTURAS, "escritorio.png"), fullPage: true });


/* ------------------------------------------------------------------ histórico */

console.log("\nHistórico · /historico");
const historico = await escritorio.newPage();
historico.on("console", (m) => m.type() === "error" && errores.push(m.text()));
historico.on("pageerror", (e) => errores.push(String(e)));

const rHistorico = await historico.goto(URL.replace(/\/$/, "") + "/historico", { waitUntil: "networkidle" });
revisar("responde 200", rHistorico?.status() === 200, `status ${rHistorico?.status()}`);
await recorrer(historico);

// El catálogo es lo más fácil de dejar desactualizado: se genera y se congela.
// Si la página no muestra los mismos eventos que el último `pnpm mundo`,
// alguien editó a mano o se olvidó de regenerar.
const textoHistorico = await historico.locator("body").innerText();
revisar(
  `dice ${CONTEOS[0].toLocaleString("es-CO")} sismos`,
  textoHistorico.includes(CONTEOS[0].toLocaleString("es-CO"))
);
revisar(
  `lista los ${SEIS_MAS.length} sismos de M6+`,
  await historico.locator("#mundo .sismos").first().locator(".sismo").count() === SEIS_MAS.length
);
revisar(
  "el contraste enfrenta dos sismos distintos",
  MAS_GRANDE.id !== MAS_SIGNIFICATIVO.id && textoHistorico.includes(MAS_SIGNIFICATIVO.lugar)
);
// Los lugares vienen en inglés del USGS y se traducen al generar. Si aparece
// un « of » suelto, alguien agregó un formato que el traductor no cubre.
revisar("los lugares están en español", !/\d+ km [NSEW]{1,3} of /.test(textoHistorico));

// El nav cruza rutas: desde acá los anclajes de la portada tienen que llevar
// a la portada, no a secciones que en esta página no existen.
revisar(
  "el nav vuelve a la portada",
  await historico.locator('.nav-enlaces a[href="/#problema"]').count() === 1
);

// La landing dejó de contarlo: si vuelve a aparecer ahí, se duplicó.
revisar("el histórico no está en la portada", await pagina.locator("#mundo").count() === 0);

await historico.screenshot({ path: join(CAPTURAS, "historico.png"), fullPage: true });

/* ---------------------------------------------------------------------- móvil */

console.log("\nMóvil · 390×844");
const movil = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const chico = await movil.newPage();
await chico.goto(URL, { waitUntil: "networkidle" });
await recorrer(chico);

// El desborde horizontal es el defecto clásico de una landing hecha en desktop.
const desborde = await chico.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
revisar("sin scroll horizontal", desborde <= 1, `sobran ${desborde}px`);

// Un CTA que no se alcanza con el pulgar no es un CTA.
const boton = await chico.locator(".boton-primario").first().boundingBox();
revisar("el botón principal se puede tocar", (boton?.height ?? 0) >= 40, `${boton?.height}px de alto`);

await chico.screenshot({ path: join(CAPTURAS, "movil.png"), fullPage: true });

/* ----------------------------------------------------------------- oscuro */

console.log("\nTema oscuro");
const noche = await navegador.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
const oscura = await noche.newPage();
await oscura.goto(URL, { waitUntil: "networkidle" });
await recorrer(oscura);

// El jurado abre el portátil como lo tenga. Si el tema oscuro no cambió el
// fondo, quedó un bloque de tokens sin definir y algo se lee blanco sobre
// blanco.
const fondo = await oscura.evaluate(() => getComputedStyle(document.body).backgroundColor);
const [r, g, b] = fondo.match(/\d+/g).map(Number);
revisar("el tema oscuro pinta fondo oscuro", (r + g + b) / 3 < 60, fondo);
await oscura.screenshot({ path: join(CAPTURAS, "oscuro.png"), fullPage: true });

/* ------------------------------------------------------ movimiento reducido */

console.log("\nMovimiento reducido");
const quieto = await navegador.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const sinMovimiento = await quieto.newPage();
await sinMovimiento.goto(URL, { waitUntil: "networkidle" });
await recorrer(sinMovimiento);
// Con las animaciones apagadas el contenido tiene que estar igual de visible:
// si algo entraba solo por animación, acá aparece vacío.
revisar(
  "el titular sigue visible",
  (await sinMovimiento.locator("h1").innerText()).includes("Los iPhone no")
);
await sinMovimiento.screenshot({ path: join(CAPTURAS, "sin-movimiento.png"), fullPage: true });

/* -------------------------------------------------------------------- cierre */

console.log("\nConsola");
revisar("sin errores en consola", errores.length === 0, errores.slice(0, 3).join(" · "));

await navegador.close();

console.log(`\nCapturas en ${CAPTURAS}`);
if (fallos.length) {
  console.error(`\n${fallos.length} fallo(s):\n` + fallos.map((f) => `  · ${f}`).join("\n"));
  process.exit(1);
}
console.log("\nTodo en orden ✅");
