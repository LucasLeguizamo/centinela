// Autochequeo de la transcripción: node src/transcribir.test.js
//
// No se llama a ElevenLabs (cuesta y necesita clave). Lo que se prueba es el
// filtro: qué transcripciones se aceptan como pregunta de verdad y cuáles se
// descartan. Ahí está el daño posible —contestarle un menú a un ruido, o
// tirar a la basura una pregunta legítima.

import assert from "node:assert/strict";
import { interpretar, textoDeAudio } from "./transcribir.js";

// --- Una nota de voz normal pasa y queda en una sola línea.
assert.deepEqual(
  interpretar({ text: "  ¿Dónde\n queda el   albergue? ", language_code: "spa", language_probability: 0.98 }),
  { texto: "¿Dónde queda el albergue?", idioma: "spa" }
);

// --- Audio mudo: ElevenLabs no falla, devuelve vacío. No es una pregunta.
assert.equal(interpretar({ text: "", language_probability: 0.9 }), null);
assert.equal(interpretar({ text: "eh", language_probability: 0.9 }), null);

// --- Ruido: el modelo devuelve algo, pero no reconoció español. Inventó.
assert.equal(interpretar({ text: "la la la la", language_code: "spa", language_probability: 0.2 }), null);

// --- Sin el dato de confianza igual se acepta: la API puede no mandarlo y
// tirar una pregunta buena es peor que contestar una dudosa.
assert.deepEqual(interpretar({ text: "necesito agua" }), { texto: "necesito agua", idioma: "spa" });

// --- Un mensaje que no trae audio se ignora sin tocar la red.
assert.equal(await textoDeAudio({ type: "text", text: { body: "hola" } }), null);

// --- Un audio sin credenciales no explota: devuelve null y el ciclo de
// respuestas sigue vivo para todos los demás.
delete process.env.WHATSAPP_TOKEN;
assert.equal(await textoDeAudio({ type: "audio", from: "573000000000", audio: { id: "123" } }), null);

console.log("Transcripción: todo en orden.");
