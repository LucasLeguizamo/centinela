// Modo demo: cerrar el círculo delante de alguien.
//
// El onboarding se ve en 30 segundos, pero la parte que importa —la alerta—
// solo se ve cuando tiembla. Esto espera a que el número quede suscrito y dos
// minutos después le manda la alerta de un sismo REAL reciente, la que le
// habría llegado si lo hubiera sentido.
//
//   node src/demo.js 573223224730           → espera tu mensaje y avisa
//   node src/demo.js 573223224730 --ya      → manda el simulacro ahora
//   node src/demo.js 573223224730 --seco    → muestra el mensaje, no lo manda
//
// El mensaje va marcado como SIMULACRO y no se negocia: decirle a alguien que
// tembló cuando no tembló rompe lo único que este bot tiene que cuidar, que le
// crean el día que sea de verdad.

import { sismosRecientes, evaluarAlerta, normalizarMunicipio } from "./sismos.js";
import { leerSuscriptores } from "./db.js";
import { sincronizar } from "./suscribir.js";
import { enviarBotones, entrantes } from "./whatsapp.js";

const ESPERA_MS = 2 * 60_000;
const SONDEO_MS = 15_000;

/**
 * De los sismos reales recientes, el que más se sintió en ese lugar.
 *
 * No el más grande: un M7 en Japón no le dice nada a alguien en Quibdó, y un
 * M4 a 40 km sí. La demo tiene que mostrar el mensaje que la persona habría
 * recibido de verdad.
 */
export function elegirSimulacro(sismos, lugar) {
  const evaluados = sismos
    .map((sismo) => ({ sismo, evaluacion: evaluarAlerta(sismo, lugar) }))
    .sort((a, b) => b.evaluacion.mmi - a.evaluacion.mmi);

  return evaluados[0] ?? null;
}

export function mensajeSimulacro(elegido) {
  return (
    `🧪 SIMULACRO — así se ve una alerta de verdad\n\n` +
    `${elegido.evaluacion.mensaje}\n\n` +
    `Este sismo ocurrió, pero el aviso lo disparé yo para la demo.`
  );
}

async function simulacroPara(telefono, municipio, { seco = false } = {}) {
  const lugar = normalizarMunicipio(municipio);
  // 7 días: en una semana casi siempre hay algo que se sintió en Colombia, y
  // si no, el mensaje dice honestamente que se sintió apenas.
  const sismos = await sismosRecientes({ desdeMinutos: 7 * 24 * 60, magnitudMinima: 3.5 });
  const elegido = elegirSimulacro(sismos, lugar);

  if (!elegido) {
    console.log("No hubo ningún sismo en la última semana. Nada que simular.");
    return null;
  }

  const texto = mensajeSimulacro(elegido);
  if (seco) {
    console.log(texto.replace(/^/gm, "    "));
    return texto;
  }

  // Con los mismos botones que lleva una alerta real: el simulacro tiene que
  // verse exactamente como lo que simula.
  const wamid = await enviarBotones(telefono, {
    texto,
    botones: [
      { id: "necesito_ayuda", titulo: "Necesito ayuda" },
      { id: "quiero_ayudar", titulo: "Quiero ayudar" },
    ],
  });
  console.log(`→ ${telefono} (${lugar.nombre}) SIMULACRO M${elegido.sismo.magnitud} · ${wamid}`);
  return texto;
}

async function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Espera un mensaje NUEVO de ese número —no uno viejo del historial— y devuelve
 * su suscripción ya sincronizada.
 *
 * Mirar solo la tabla de suscriptores no sirve para la demo: quien ya eligió
 * ciudad ayer sigue suscrito hoy, y el simulacro saldría antes de que la
 * persona toque el teléfono.
 */
async function esperarMensajeNuevo(telefono, { seco = false } = {}) {
  const desde = Date.now() / 1000;

  for (;;) {
    const nuevo = (await entrantes(1)).some(
      (m) => m.from === telefono && Number(m.timestamp) > desde
    );

    if (nuevo) {
      // Sincronizar después del mensaje: si eligió otra ciudad, la alerta
      // tiene que salir para esa.
      await sincronizar({ seco }).catch((e) => console.warn(`No pude sincronizar: ${e.message}`));
      const sus = (await leerSuscriptores()).find((s) => s.telefono === telefono);
      if (sus) return sus;
      console.log("Escribió, pero todavía no eligió ciudad…");
    }

    await esperar(SONDEO_MS);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const telefono = process.argv[2];
  if (!telefono) {
    console.error("Falta el número: node src/demo.js 573223224730");
    process.exit(1);
  }

  const seco = process.argv.includes("--seco");
  const ya = process.argv.includes("--ya");

  // --ya no espera nada: ni el mensaje ni los dos minutos. Es el botón de
  // pánico para cuando ya estás frente al jurado y el simulacro tiene que salir.
  let sus = (await leerSuscriptores()).find((s) => s.telefono === telefono);
  if (!ya || !sus) {
    console.log(`Esperando un mensaje de ${telefono}…`);
    sus = await esperarMensajeNuevo(telefono, { seco });
  }
  console.log(`${telefono} suscrito para ${sus.municipio}.`);

  if (!ya) {
    console.log("La alerta sale en 2 minutos.");
    await esperar(ESPERA_MS);
  }

  await simulacroPara(telefono, sus.municipio, { seco });
}
