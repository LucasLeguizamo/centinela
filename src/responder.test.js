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

  // Recursos de ayuda. La frontera fina está entre las tres: "donar sangre"
  // no es "donar dinero", y "donar" a secas es llevar cosas a un acopio.
  ["donde dono", "acopio"],
  ["dónde llevo la ayuda", "acopio"],
  ["centros de acopio", "acopio"],
  ["que puedo donar", "acopio"],
  ["quiero ayudar", "acopio"],
  ["donde llevar mercado", "acopio"],
  ["donar sangre", "sangre"],
  ["banco de sangre cerca", "sangre"],
  ["quiero donar dinero", "donar"],
  ["a que cuenta transfiero plata", "donar"],
  ["tienen nequi", "donar"],
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

// El menú tiene que anunciar lo que el bot ya sabe hacer: una capacidad que
// no se nombra no existe para quien está del otro lado.
for (const palabra of ["dono", "sangre", "dinero"]) {
  assert.ok(ayuda.includes(palabra), `el menú debería mencionar "${palabra}"`);
}

// Sin recursos cargados, las tres intenciones nuevas responden igual de bien:
// dicen que no tienen el dato y mandan a la fuente. Nunca inventan un lugar.
for (const intencion of ["acopio", "sangre", "donar"]) {
  const r = await componerRespuesta(intencion, MUNICIPIOS.quibdo);
  assert.ok(r.length > 60, `respuesta de ${intencion} demasiado corta`);
  assert.ok(!r.includes("undefined"), `respuesta de ${intencion} con huecos`);
  assert.ok(/https?:\/\//.test(r), `${intencion} debe citar una fuente consultable`);
}

// Regla dura del producto: el bot no dicta números de cuenta.
//
// Con campañas falsas activas suplantando entidades, un bot que recita una
// cuenta es el vector perfecto. Esta prueba existe para que nadie la agregue
// "por comodidad" en un commit apurado a las 3 de la mañana.
const donar = await componerRespuesta("donar", MUNICIPIOS.quibdo);
assert.ok(
  !/\d[\d\s.-]{7,}/.test(donar.replace(/https?:\/\/\S+/g, "")),
  "la respuesta de donación no puede contener algo con forma de número de cuenta"
);
assert.ok(
  /oficial/.test(donar),
  "la respuesta de donación debe mandar al canal oficial de cada organización"
);

console.log(`✓ responder.js ok — ${CASOS.length} frases clasificadas`);
