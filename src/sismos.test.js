// Autochequeo mínimo: node src/sismos.test.js
// Falla si la geometría o el umbral se rompen. Sin frameworks a propósito.

import assert from "node:assert/strict";
import {
  distanciaHipocentral,
  intensidadEn,
  describirIntensidad,
  evaluarAlerta,
  normalizarMunicipio,
  MUNICIPIOS,
} from "./sismos.js";

// El evento real del 10 de agosto de 2026, con los datos del USGS.
const CHOCO = {
  magnitud: 7.4,
  lat: 4.8436,
  lon: -76.2422,
  profundidadKm: 110.285,
  lugar: "5 km S of San José del Palmar, Colombia",
  hora: new Date("2026-08-10T12:34:00Z"),
  url: "https://earthquake.usgs.gov/",
};

// La profundidad cuenta: 110 km bajo tierra nunca está "a 0 km" de nadie.
const dQuibdo = distanciaHipocentral(CHOCO, MUNICIPIOS.quibdo);
assert.ok(dQuibdo > 110, `hipocentral debe superar la profundidad, dio ${dQuibdo}`);

// Monotonía: más lejos, menos intensidad. Si esto se invierte, el signo del
// término de distancia se rompió y el producto alerta al revés.
const mmiQuibdo = intensidadEn(CHOCO, MUNICIPIOS.quibdo);
const mmiBogota = intensidadEn(CHOCO, MUNICIPIOS.bogota);
assert.ok(
  mmiQuibdo > mmiBogota,
  `Quibdó (${mmiQuibdo.toFixed(1)}) debe sentir más que Bogotá (${mmiBogota.toFixed(1)})`
);

// Un M7.4 se sintió de verdad en el eje cafetero: 1.168 personas lo reportaron
// al USGS. Si el modelo dice que no se sintió, el modelo está mal.
assert.ok(
  evaluarAlerta(CHOCO, MUNICIPIOS.pereira).alertar,
  "un M7.4 tiene que alertar en Pereira"
);

// Y un sismo pequeño y lejano no puede despertar a nadie: sin este corte, la
// demo manda decenas de mensajes porque Colombia tiembla todo el día.
const CHICO = {
  magnitud: 3.2,
  lat: 11.5,
  lon: -72.0,
  profundidadKm: 20,
  lugar: "La Guajira, Colombia",
  hora: new Date("2026-08-15T03:00:00Z"),
  url: "https://earthquake.usgs.gov/",
};
assert.equal(
  evaluarAlerta(CHICO, MUNICIPIOS.cali).alertar,
  false,
  "un M3.2 a cientos de km no debe alertar en Cali"
);

// Rango válido de MMI.
for (const lugar of Object.values(MUNICIPIOS)) {
  const mmi = intensidadEn(CHOCO, lugar);
  assert.ok(mmi >= 1 && mmi <= 12, `MMI fuera de rango en ${lugar.nombre}: ${mmi}`);
}

// El usuario escribe "quibdo", "Quibdó" o " QUIBDO " y todo debe resolver igual.
assert.equal(normalizarMunicipio(" QUIBDÓ ").nombre, "Quibdó");
assert.equal(normalizarMunicipio("Medellin").nombre, "Medellín");
assert.equal(normalizarMunicipio("Springfield"), null);

// Umbrales de percepción.
assert.equal(describirIntensidad(1.5).alertar, false);
assert.equal(describirIntensidad(3.5).alertar, true);

console.log("✓ sismos.js ok");
console.log(`  Quibdó  MMI ${mmiQuibdo.toFixed(1)}  ${describirIntensidad(mmiQuibdo).etiqueta}`);
console.log(`  Pereira MMI ${intensidadEn(CHOCO, MUNICIPIOS.pereira).toFixed(1)}`);
console.log(`  Bogotá  MMI ${mmiBogota.toFixed(1)}  ${describirIntensidad(mmiBogota).etiqueta}`);
