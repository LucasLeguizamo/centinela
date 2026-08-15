// Autochequeo del aviso de tsunami: node src/tsunami.test.js
//
// Este es el único camino del sistema donde un error se paga con vidas.
// Se prueban las dos direcciones: que no calle cuando hay peligro, y que no
// grite cuando no lo hay.

import assert from "node:assert/strict";
import { boletinesPTWC, amenazaColombia, mensajeTsunami } from "./tsunami.js";
import { MUNICIPIOS } from "./sismos.js";

// --- El feed real del PTWC tiene que seguir teniendo la forma que esperamos.
// Si NOAA cambia el XML, este test avisa antes de que un boletín real se
// pierda por un parser roto.
const boletines = await boletinesPTWC();
assert.ok(Array.isArray(boletines), "el feed debe devolver una lista");

for (const b of boletines) {
  assert.ok(b.region, "cada boletín trae región");
  assert.ok(b.categoria, "cada boletín trae categoría");
  assert.ok(
    ["information", "warning", "advisory", "watch"].includes(b.categoria),
    `categoría inesperada del PTWC: "${b.categoria}"`
  );
  assert.ok(Number.isFinite(b.lat) && Number.isFinite(b.lon), "coordenadas numéricas");
}

// --- "Information" significa explícitamente que NO hay amenaza. Reenviarlo
// entrena a la gente a ignorar el aviso que sí importa.
const informativo = {
  categoria: "information",
  boletinUrl: "https://www.tsunami.gov/loquesea.txt",
  region: "HAWAII",
};
assert.equal(
  await amenazaColombia(informativo),
  false,
  "un boletín informativo nunca puede disparar alerta"
);

// Sin link al boletín oficial no se alerta: nunca mandamos un aviso de
// tsunami que la persona no pueda verificar en la fuente.
assert.equal(
  await amenazaColombia({ categoria: "warning", boletinUrl: null }),
  false,
  "sin boletín verificable no se alerta"
);

// --- Los tres niveles de peligro tienen que producir un mensaje accionable.
const NIVELES = ["warning", "advisory", "watch"];
for (const categoria of NIVELES) {
  const texto = mensajeTsunami(
    {
      categoria,
      region: "NEAR COAST OF ECUADOR",
      magnitud: "8.1",
      boletinUrl: "https://www.tsunami.gov/eventoprueba.txt",
    },
    MUNICIPIOS.tumaco
  );

  assert.ok(texto.includes("Tumaco"), `${categoria}: debe nombrar la ciudad`);
  assert.ok(texto.includes("M8.1"), `${categoria}: debe traer la magnitud`);
  assert.ok(texto.includes("tsunami.gov"), `${categoria}: debe enlazar el boletín oficial`);
  assert.ok(!texto.includes("undefined"), `${categoria}: sin huecos`);
  assert.ok(
    /autoridad local/.test(texto),
    `${categoria}: debe ceder la última palabra a la autoridad local`
  );
}

// La alerta máxima tiene que ordenar evacuar, no sugerirlo.
const alerta = mensajeTsunami(
  { categoria: "warning", region: "OFF COAST OF COLOMBIA", magnitud: "8.4", boletinUrl: "x.txt" },
  MUNICIPIOS.tumaco
);
assert.ok(/terreno alto AHORA/.test(alerta), "un warning debe ordenar subir a terreno alto ya");

// Un aviso sin magnitud sigue siendo válido: el PTWC a veces publica antes
// de tenerla, y esperar el dato sería perder los minutos que importan.
const sinMagnitud = mensajeTsunami(
  { categoria: "warning", region: "OFF COAST OF COLOMBIA", boletinUrl: "x.txt" },
  MUNICIPIOS.tumaco
);
assert.ok(!sinMagnitud.includes("undefined"), "sin magnitud no puede dejar huecos");

console.log(`✓ tsunami.js ok — feed PTWC con ${boletines.length} boletín(es) vigente(s)`);
for (const b of boletines) console.log(`  [${b.categoria}] ${b.region}`);
