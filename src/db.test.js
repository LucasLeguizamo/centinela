// Autochequeo de la capa de Supabase: node src/db.test.js
//
// Este archivo existe por un fallo concreto. La ruta de Supabase se escribió
// entera sin ejecutarse nunca, porque el resto de los tests corren sobre
// archivos JSON y no tocan la red. Al probarla por primera vez contra un
// servidor real, el primer insert murió con "Unexpected end of JSON input":
// PostgREST responde 201 con el cuerpo vacío y `res.json()` revienta.
//
// El doble de `fetch` que se usa acá imita eso a propósito —cuerpos vacíos en
// 201 y 204— para que el fallo no pueda volver sin que una prueba se queje.

import assert from "node:assert/strict";

process.env.SUPABASE_URL = "https://ejemplo.supabase.co";
process.env.SUPABASE_SERVICE_KEY = "clave-de-prueba";

const llamadas = [];
const fetchReal = globalThis.fetch;

/**
 * Responde como PostgREST: 201 y 204 sin cuerpo, GET con JSON.
 *
 * `json()` se comporta como el de una Response real y revienta con el cuerpo
 * vacío. Es lo que hace que esta prueba reproduzca el fallo de verdad en vez
 * de uno parecido: si alguien vuelve a `res.json()`, falla acá con el mismo
 * mensaje que apareció contra el servidor real.
 */
function respuesta(status, cuerpo) {
  return {
    ok: status < 400,
    status,
    text: async () => cuerpo,
    json: async () => JSON.parse(cuerpo),
  };
}

// Los GET devuelven "[]" salvo cuando se prueba el caso de cuerpo vacío.
let cuerpoGet = "[]";

globalThis.fetch = async (url, opciones = {}) => {
  const metodo = opciones.method ?? "GET";
  llamadas.push({ metodo, url: String(url), opciones });

  if (metodo === "GET") return respuesta(200, cuerpoGet);
  if (metodo === "PATCH") return respuesta(204, "");
  return respuesta(201, "");
};

const {
  usandoSupabase,
  reemplazarRecursos,
  guardarSuscriptor,
  marcarEnviados,
  leerSuscriptores,
  leerRespondidos,
  leerEnviados,
} = await import("./db.js");

assert.equal(usandoSupabase, true, "con las variables puestas debe usar Supabase");

const fila = {
  tipo: "acopio",
  nombre: "Punto de prueba",
  lat: 4.81,
  lon: -75.69,
  fuente: "prueba",
  fuente_url: "https://ejemplo.co",
  hash: "abc123",
};

// El fallo original: cualquiera de estas tres reventaba antes de escribir nada.
await reemplazarRecursos("prueba", [fila]);
await guardarSuscriptor({ telefono: "573001112233", municipio: "Pereira" });
await marcarEnviados(["evento:573001112233"]);
await leerSuscriptores();

const insertRecursos = llamadas.find(
  (c) => c.metodo === "POST" && c.url.includes("/recursos")
);

// `on_conflict` no es opcional: la clave de deduplicación es (fuente, hash) y
// no la primaria. Sin él PostgREST resuelve contra `id`, que trae un uuid
// nuevo por fila, así que nunca hay conflicto y la SEGUNDA corrida de la
// ingesta revienta con duplicate key. Falla a los veinte minutos, no en la
// primera prueba, que es lo que lo hace difícil de ver.
assert.ok(
  insertRecursos.url.includes("on_conflict=fuente,hash"),
  "el upsert de recursos tiene que declarar (fuente, hash) como clave de conflicto"
);
assert.equal(
  insertRecursos.opciones.headers.Prefer,
  "resolution=merge-duplicates",
  "sin merge-duplicates el upsert es un insert a secas"
);

// Un fetch sin plazo cuelga el ciclo entero en un cron serverless: la función
// muere por tiempo máximo y esa corrida no alerta a nadie.
for (const c of llamadas) {
  assert.ok(c.opciones.signal, `la petición ${c.metodo} ${c.url} salió sin plazo`);
}

// Se apaga por marca de agua, no enumerando hashes: 145 hashes son ~5 KB de
// query string y las fuentes que faltan por conectar son más grandes.
const apagado = llamadas.find((c) => c.metodo === "PATCH");
assert.ok(
  apagado.url.includes("visto_en=lt.") && !apagado.url.includes("not.in"),
  "lo obsoleto se apaga por marca de agua, no listando cada hash"
);

// Las tres lecturas con el cuerpo vacío.
//
// Arreglar `pedir()` para que devuelva null en vez de reventar mueve el
// problema en vez de resolverlo: quien lo llama hace `.map()` sobre eso. Sería
// cambiar un fallo ruidoso en la ingesta —que alguien ve— por un TypeError en
// el ciclo de alertas, que corre sin nadie mirando. Los `?? []` cierran eso y
// esto los fija.
cuerpoGet = "";

assert.deepEqual(await leerSuscriptores(), [], "sin cuerpo, la lista va vacía y no null");
assert.deepEqual([...(await leerRespondidos())], [], "leerRespondidos no puede reventar");
assert.deepEqual([...(await leerEnviados())], [], "leerEnviados no puede reventar");

cuerpoGet = "[]";

globalThis.fetch = fetchReal;
console.log(`✓ db.js ok — ${llamadas.length} peticiones, cuerpos vacíos incluidos`);
