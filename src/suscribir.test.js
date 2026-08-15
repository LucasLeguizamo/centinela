// Autochequeo del sincronizador: node src/suscribir.test.js
//
// Sin esto, alguien se suscribe, recibe "quedaste suscrito ✅" y no le llega
// nunca nada. Es la peor falla del sistema porque es silenciosa y cae del
// lado de quien confió.

import assert from "node:assert/strict";
import { ciudadDeMensaje } from "./suscribir.js";

// La lista interactiva devuelve el id exacto: siempre resuelve.
assert.equal(
  ciudadDeMensaje({ interactive: { list_reply: { id: "quibdo", title: "Quibdó" } } })?.nombre,
  "Quibdó"
);
assert.equal(
  ciudadDeMensaje({ interactive: { list_reply: { id: "tumaco" } } })?.costaPacifica,
  true,
  "Tumaco debe quedar marcada como costa Pacífica"
);

// Pero la gente escribe igual aunque le mandes una lista.
assert.equal(ciudadDeMensaje({ text: { body: "Quibdó" } })?.nombre, "Quibdó");
assert.equal(ciudadDeMensaje({ text: { body: "quibdo" } })?.nombre, "Quibdó");
assert.equal(ciudadDeMensaje({ text: { body: "  MEDELLIN  " } })?.nombre, "Medellín");

// Y a veces el texto solo viene en el campo de Kapso.
assert.equal(ciudadDeMensaje({ kapso: { content: "Pereira" } })?.nombre, "Pereira");

// Lo que no resuelve tiene que devolver null, no una ciudad cualquiera:
// suscribir a alguien a la ciudad equivocada es peor que no suscribirlo.
assert.equal(ciudadDeMensaje({ text: { body: "Springfield" } }), null);
assert.equal(ciudadDeMensaje({ text: { body: "hola" } }), null);
assert.equal(ciudadDeMensaje({}), null);

// Un id de lista que no conocemos no puede colarse como ciudad válida.
assert.equal(ciudadDeMensaje({ interactive: { list_reply: { id: "narnia" } } }), null);

console.log("✓ suscribir.js ok");
