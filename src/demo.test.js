// Autochequeo del modo demo: node src/demo.test.js

import assert from "node:assert/strict";
import { elegirSimulacro, mensajeSimulacro } from "./demo.js";
import { MUNICIPIOS } from "./sismos.js";

const quibdo = MUNICIPIOS.quibdo;

const lejano = {
  id: "lejos",
  magnitud: 7.2,
  lugar: "Honshu, Japón",
  hora: new Date("2026-08-16T10:00:00Z"),
  lat: 38.3,
  lon: 142.4,
  profundidadKm: 30,
  url: "https://usgs.gov/lejos",
};

const cercano = {
  id: "cerca",
  magnitud: 4.1,
  lugar: "20 km de Quibdó",
  hora: new Date("2026-08-16T11:00:00Z"),
  lat: 5.8,
  lon: -76.7,
  profundidadKm: 25,
  url: "https://usgs.gov/cerca",
};

// Lo que la demo tiene que mostrar es lo que la persona habría sentido, no el
// titular más grande: un M7 al otro lado del mundo no le movió nada.
const elegido = elegirSimulacro([lejano, cercano], quibdo);
assert.equal(elegido.sismo.id, "cerca");

const texto = mensajeSimulacro(elegido);
assert.match(texto, /SIMULACRO/);
assert.match(texto, /lo disparé yo/);
assert.match(texto, /Quibdó/);

// Sin sismos no se inventa uno.
assert.equal(elegirSimulacro([], quibdo), null);

console.log("✓ demo.js ok — simulacro marcado y elegido por lo que se sintió");
