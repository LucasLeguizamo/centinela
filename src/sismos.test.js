// Autochequeo mínimo: node src/sismos.test.js
// Falla si la geometría o el umbral se rompen. Sin frameworks a propósito.

import assert from "node:assert/strict";
import {
  distanciaHipocentral,
  intensidadEn,
  describirIntensidad,
  evaluarAlerta,
  normalizarMunicipio,
  clasificarReplicas,
  mensajeReplicas,
  MUNICIPIOS,
} from "./sismos.js";

// El evento real del 10 de agosto de 2026, con los datos del USGS.
const CHOCO = {
  id: "principal",
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

// --- Réplicas (US-007) -------------------------------------------------
// La secuencia real del Chocó: el principal y sus dos réplicas, con los
// datos que devolvió el USGS.
const SECUENCIA = [
  CHOCO,
  {
    id: "replica_m5",
    magnitud: 5.0,
    lat: 4.9,
    lon: -76.4,
    profundidadKm: 99,
    lugar: "16 km W of San José del Palmar",
    hora: new Date("2026-08-10T13:18:00Z"),
    url: "",
  },
  {
    id: "replica_m42",
    magnitud: 4.2,
    lat: 4.88,
    lon: -76.35,
    profundidadKm: 101,
    lugar: "11 km WNW of San José del Palmar",
    hora: new Date("2026-08-10T18:00:00Z"),
    url: "",
  },
  // Mismo día, magnitud parecida, pero a 900 km: no es réplica de nada.
  {
    id: "lejano",
    magnitud: 4.4,
    lat: 11.5,
    lon: -72.0,
    profundidadKm: 30,
    lugar: "La Guajira",
    hora: new Date("2026-08-10T20:00:00Z"),
    url: "",
  },
];

const clasificados = clasificarReplicas(SECUENCIA.map((s) => ({ id: s.id ?? "principal", ...s })));
const porId = Object.fromEntries(clasificados.map((s) => [s.id, s]));

assert.equal(porId.principal.replicaDe, null, "el M7.4 no es réplica de nadie");
assert.equal(porId.replica_m5.replicaDe, "principal", "el M5.0 es réplica del M7.4");
assert.equal(porId.replica_m42.replicaDe, "principal", "el M4.2 es réplica del M7.4");
assert.equal(porId.lejano.replicaDe, null, "un sismo a 900 km no es réplica");

// Dos réplicas tienen que caber en UN mensaje, no en dos.
const replicas = clasificados.filter((s) => s.replicaDe);
const texto = mensajeReplicas(replicas, MUNICIPIOS.quibdo);
assert.ok(texto.includes("2 réplicas"), "debe agrupar las dos réplicas");
assert.ok(texto.includes("M5"), "debe destacar la mayor");
assert.ok(!texto.includes("undefined"), "sin huecos en el mensaje");

console.log("✓ sismos.js ok");
console.log(`  Quibdó  MMI ${mmiQuibdo.toFixed(1)}  ${describirIntensidad(mmiQuibdo).etiqueta}`);
console.log(`  Pereira MMI ${intensidadEn(CHOCO, MUNICIPIOS.pereira).toFixed(1)}`);
console.log(`  Bogotá  MMI ${mmiBogota.toFixed(1)}  ${describirIntensidad(mmiBogota).etiqueta}`);
