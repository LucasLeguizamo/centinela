// Autochequeo del clasificador de intenciones: node src/responder.test.js

import assert from "node:assert/strict";
import { clasificarIntencion, componerRespuesta } from "./responder.js";
import { MUNICIPIOS } from "./sismos.js";

// Cómo escribe la gente de verdad: sin acentos, sin mayúsculas, con typos.
const CASOS = [
  ["¿qué tan fuerte fue?", "detalle"],
  ["que tan fuerte fue", "detalle"],
  ["QUE PASO", "detalle"],
  ["cuanto fue la magnitud", "detalle"],
  ["temblo otra vez?", "replicas"],
  ["hubo replicas", "replicas"],
  ["¿hubo réplicas?", "replicas"],
  ["quiero cambiar de ciudad", "cambiar"],
  ["me mude", "cambiar"],
  ["BAJA", "baja"],
  ["ya no quiero", "baja"],
  ["parar", "baja"],
  ["hola", "ayuda"],
  ["ayuda", "ayuda"],
  ["buenas", "ayuda"],
];

for (const [texto, esperado] of CASOS) {
  assert.equal(
    clasificarIntencion(texto),
    esperado,
    `"${texto}" debería ser ${esperado}, dio ${clasificarIntencion(texto)}`
  );
}

// "baja" gana sobre todo lo demás: si alguien quiere irse, se va. Un producto
// de notificaciones que discute la baja es spam.
assert.equal(clasificarIntencion("que tan fuerte fue? ya no quiero mas"), "baja");

// Las respuestas que no consultan la red deben salir completas y sin huecos.
for (const intencion of ["baja", "cambiar", "ayuda"]) {
  const r = await componerRespuesta(intencion, MUNICIPIOS.quibdo);
  assert.ok(r.length > 40, `respuesta de ${intencion} demasiado corta`);
  assert.ok(!r.includes("undefined"), `respuesta de ${intencion} con huecos`);
}

// La ayuda tiene que repetir la advertencia: es la promesa que no podemos
// dejar que el usuario malentienda.
const ayuda = await componerRespuesta("ayuda", MUNICIPIOS.quibdo);
assert.ok(/despu[eé]s del temblor, no antes/.test(ayuda), "la ayuda debe aclarar que no es alerta temprana");

console.log(`✓ responder.js ok — ${CASOS.length} frases clasificadas`);
