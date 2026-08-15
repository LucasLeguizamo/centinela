// Autochequeo del conector de acopios: node src/fuentes/acopios-emergency.test.js
//
// Se prueba contra un payload RSC sintético, no contra la red. El conector lee
// un contrato no publicado de un sitio ajeno: si la prueba dependiera de que
// ese sitio esté arriba, fallaría por razones que no son culpa de este repo.

import assert from "node:assert/strict";
import { extraer, aRecurso } from "./acopios-emergency.js";

const CENTROS = [
  {
    id: "1",
    name: "Coliseo El Salitre",
    organization: "Alcaldía de Bogotá",
    department: "Bogotá D.C.",
    municipality: "Bogotá D.C.",
    // El corchete es a propósito: un recorte ingenuo del arreglo cortaría acá.
    address: "Calle 63 [entrada norte] #47-06",
    latitude: 4.6586,
    longitude: -74.0942,
    accepted_items: ["Agua potable", "Arroz", "Pañales"],
    rejected_items: ["Productos vencidos"],
    urgent_needs: ["Agua potable"],
    schedule_text: "8:00 a. m. a 6:00 p. m.",
    ends_at: null,
    phone: "3001234567",
    whatsapp: null,
    source_url: "https://bogota.gov.co/puntos",
    source_published_at: "2026-08-13",
    verification_status: "verified",
  },
  {
    id: "2",
    name: "Punto que ya cerró",
    municipality: "Cali",
    address: "Cra 1 #1-1",
    latitude: 3.45,
    longitude: -76.53,
    accepted_items: [],
    ends_at: "2026-08-11",
    verification_status: "reported",
  },
];

/** Reproduce cómo Next.js reparte el payload en varios push. */
function htmlFalso(centros) {
  const cuerpo = `2:{"centers":${JSON.stringify(centros)}}`;
  const corte = Math.floor(cuerpo.length / 2);
  return [cuerpo.slice(0, corte), cuerpo.slice(corte)]
    .map((t) => `<script>self.__next_f.push([1,${JSON.stringify(t)}])</script>`)
    .join("\n");
}

const filas = await extraer({ html: htmlFalso(CENTROS) });

// El que cerró el 11 de agosto no puede seguir apareciendo: mandar a alguien
// con un mercado a un punto cerrado es peor que no responder.
assert.equal(filas.length, 1, "debería quedar solo el centro vigente");

const [r] = filas;
assert.equal(r.tipo, "acopio");
assert.equal(r.nombre, "Coliseo El Salitre");
assert.ok(
  r.direccion.includes("[entrada norte]"),
  "el corchete dentro de la dirección no debe cortar el arreglo"
);
assert.equal(r.municipio, "Bogotá D.C.");
assert.equal(r.telefono, "573001234567", "el teléfono debe quedar en E.164");
assert.equal(r.verificado, true);
assert.equal(r.fuente, "emergency-rosy");
assert.equal(
  r.fuente_url,
  "https://bogota.gov.co/puntos",
  "hay que citar la fuente primaria, no el agregador"
);
assert.deepEqual(r.urgente, ["Agua potable"]);
assert.ok(r.hash?.length === 32, "cada fila necesita huella para el upsert");

// Misma entrada, misma huella: si el contenido no cambió el upsert no toca la fila.
assert.equal(aRecurso(CENTROS[0]).hash, r.hash);
assert.notEqual(
  aRecurso({ ...CENTROS[0], schedule_text: "otro horario" }).hash,
  r.hash,
  "un cambio de horario tiene que cambiar la huella"
);

// Fallar ruidosamente es parte del diseño: cero centros se confundiría con
// "no hay dónde donar" y el bot le diría eso a alguien que sí tiene dónde.
await assert.rejects(
  () => extraer({ html: "<html>sin payload</html>" }),
  /payload RSC/,
  "sin payload RSC hay que reventar, no devolver vacío"
);
await assert.rejects(
  () => extraer({ html: htmlFalso([]) }),
  /0 centros/,
  "con 0 centros hay que abortar antes de vaciar la tabla"
);

console.log("✓ acopios-emergency.js ok — extracción, vigencia, E.164 y huella");
