// Pieza de demo: un mismo sismo, visto desde varias ciudades.
//
// Es la prueba visual de la tesis. Todo feed sísmico del mundo publica
// "M7.4". Esta tabla muestra que ese número solo no le sirve a nadie:
// el mismo evento fue "fuerte" en Pereira y "leve" en Bogotá.
//
//   node src/comparar.js              → el sismo más grande de la semana
//   node src/comparar.js --dias 30    → ventana más amplia

import { sismosRecientes, evaluarAlerta, MUNICIPIOS } from "./sismos.js";

const CIUDADES = ["quibdo", "pereira", "manizales", "cali", "medellin", "bogota", "barranquilla"];

const i = process.argv.indexOf("--dias");
const dias = i > -1 ? Number(process.argv[i + 1]) : 7;

const sismos = await sismosRecientes({ desdeMinutos: dias * 24 * 60, magnitudMinima: 2.5 });

if (sismos.length === 0) {
  console.log(`No hubo sismos M2.5+ en los últimos ${dias} días.`);
  process.exit(0);
}

const sismo = sismos.reduce((a, b) => (b.magnitud > a.magnitud ? b : a));

console.log(`\n  M${sismo.magnitud} · ${sismo.lugar}`);
console.log(`  ${sismo.hora.toLocaleString("es-CO", { timeZone: "America/Bogota" })} · ${Math.round(sismo.profundidadKm)} km de profundidad\n`);
console.log("  ciudad          dist    MMI   se sintió              ¿avisamos?");
console.log("  " + "─".repeat(66));

for (const clave of CIUDADES) {
  const lugar = MUNICIPIOS[clave];
  const r = evaluarAlerta(sismo, lugar);
  console.log(
    "  " +
      lugar.nombre.padEnd(14) +
      `${r.distanciaKm}`.padStart(5) + " km" +
      `${r.mmi}`.padStart(6) + "   " +
      r.etiqueta.padEnd(22) +
      (r.alertar ? "sí" : "—")
  );
}

console.log(
  `\n  Un solo evento, ${CIUDADES.filter((c) => evaluarAlerta(sismo, MUNICIPIOS[c]).alertar).length} ` +
    `de ${CIUDADES.length} ciudades avisadas, cada una con su propio mensaje.\n`
);
