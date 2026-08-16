// Autochequeo del clasificador por modelo: node src/entender.test.js
//
// No se llama a OpenRouter (cuesta y necesita clave). Lo que se prueba es el
// filtro de la respuesta y que la caída no se propague. Ahí está el daño
// posible: que el modelo devuelva una categoría inventada y el bot conteste
// cualquier cosa, o que OpenRouter caído tumbe el ciclo de respuestas.

import assert from "node:assert/strict";
import { interpretar, entender, INTENCIONES } from "./entender.js";

const respuesta = (texto) => ({ choices: [{ message: { content: texto } }] });

// --- Una clasificación limpia pasa.
assert.equal(interpretar(respuesta("acopio")), "acopio");

// --- Los modelos adornan: punto final, negritas, mayúsculas, salto de línea.
assert.equal(interpretar(respuesta("acopio.")), "acopio");
assert.equal(interpretar(respuesta("**buscar_persona**")), "buscar_persona");
assert.equal(interpretar(respuesta("  Reportar_Dano\n")), "reportar_dano");

// --- Una categoría que no existe se descarta. Preferimos "no sé" a contestar
// con la más parecida: cada id tiene una respuesta distinta escrita.
assert.equal(interpretar(respuesta("donaciones")), null);
assert.equal(interpretar(respuesta("ninguna")), null);
assert.equal(interpretar(respuesta("Creo que la persona quiere donar sangre")), null);

// --- Respuestas rotas de la API no explotan.
assert.equal(interpretar({}), null);
assert.equal(interpretar(null), null);

// --- Toda intención que el modelo puede elegir tiene que ser contestable.
const { componerRespuesta } = await import("./responder.js");
const { MUNICIPIOS } = await import("./sismos.js");
for (const id of INTENCIONES) {
  const texto = await componerRespuesta(id, MUNICIPIOS.bogota, id);
  assert.ok(texto?.length > 20, `la intención ${id} no tiene respuesta`);
}

// --- Sin clave no se toca la red: devuelve null y el ciclo sigue.
delete process.env.OPENROUTER_API_KEY;
assert.equal(await entender("junte ropa usada y pañales, ¿le sirve a alguien?"), null);
assert.equal(await entender(""), null);

console.log("Clasificador por modelo: todo en orden.");
