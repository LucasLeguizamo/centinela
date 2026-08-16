// Autochequeo del respaldo por SMS: node src/sms.test.js
//
// No se prueba el envío (eso cuesta plata y depende de Twilio), sino lo
// único que puede romper una alerta en silencio: que el texto quepa en un
// solo mensaje.

import assert from "node:assert/strict";
import { aGsm, recortar } from "./sms.js";

// --- Las tildes que sacan al SMS del alfabeto GSM-7 se van.
assert.equal(aGsm("Sismo cerca de Bogotá, réplica en Popayán"), "Sismo cerca de Bogota, replica en Popayan");

// --- La ñ se queda: está en GSM-7 y cambia el significado.
assert.equal(aGsm("hace un año"), "hace un año");

// --- Un mensaje corto no se toca más allá de las tildes.
assert.equal(recortar("Sismo M5.2 cerca de Cúcuta"), "Sismo M5.2 cerca de Cucuta");

// --- Los saltos de línea del mensaje de WhatsApp se aplanan.
assert.equal(recortar("Sismo M5.2\n\nEpicentro: Zipaquira"), "Sismo M5.2 Epicentro: Zipaquira");

// --- Uno largo cabe en un solo SMS y avisa que quedó cortado.
const largo = recortar("Temblor. " + "detalle ".repeat(40));
assert.equal(largo.length, 160, "un SMS son 160 caracteres, ni uno más");
assert.ok(largo.endsWith("..."), "el corte tiene que verse");

// --- El límite es exacto: 160 pasa entero, 161 se corta.
assert.equal(recortar("a".repeat(160)).length, 160);
assert.equal(recortar("a".repeat(161)), "a".repeat(157) + "...");

console.log("SMS: todo en orden.");
