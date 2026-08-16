// Lo que tiene que estar vivo para que Centinela sea un bot y no un script.
//
// Las tres piezas corrían a mano, y a mano significa que alguien toca un botón
// y no pasa nada, que alguien pide la baja y le sigue llegando la alerta, y que
// tiembla a las 3 de la mañana y el aviso sale cuando alguien se despierta.
//
//   node src/vigilar.js            → las tres, cada 15 segundos
//   node src/vigilar.js --seco     → dice qué haría, sin mandar nada
//
// ponytail: un `while` con sleep, no un cron ni una cola ni un supervisor. El
// techo es que muere con el proceso y no se entera nadie; se sube moviendo el
// responder a un webhook de Kapso y las alertas a un cron del host.

import { sincronizar } from "./suscribir.js";
import { atenderPreguntas } from "./responder.js";
import { revisarYAlertar } from "./alertar.js";

const CADA_MS = 15_000;

const TAREAS = [
  // El orden importa: primero se registran las altas y las bajas, para no
  // contestarle ni alertar a alguien que acaba de pedir que lo dejen en paz.
  ["suscripciones", sincronizar],
  ["respuestas", atenderPreguntas],
  ["alertas", revisarYAlertar],
];

export async function vuelta({ seco = false } = {}) {
  for (const [nombre, tarea] of TAREAS) {
    // Que una falle no puede tumbar a las otras dos: si el USGS no responde,
    // las preguntas de la gente se siguen contestando igual.
    await tarea({ seco }).catch((e) => console.warn(`[${nombre}] falló: ${e.message}`));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const seco = process.argv.includes("--seco");
  console.log(`Vigilando cada ${CADA_MS / 1000}s${seco ? " (en seco)" : ""}. Ctrl-C para parar.`);

  for (;;) {
    await vuelta({ seco });
    await new Promise((r) => setTimeout(r, CADA_MS));
  }
}
