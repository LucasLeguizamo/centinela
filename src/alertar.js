// US-005: del sismo detectado al WhatsApp entregado.
//
// Corre cada minuto: pregunta al USGS, evalúa la intensidad para cada
// suscriptor en su municipio, y le escribe solo a quien de verdad lo sintió.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import {
  sismosRecientes,
  evaluarAlerta,
  normalizarMunicipio,
  clasificarReplicas,
  mensajeReplicas,
} from "./sismos.js";
import { avisosParaColombia, mensajeTsunami } from "./tsunami.js";
import { leerSuscriptores, leerEnviados, marcarEnviados } from "./db.js";

const ejecutar = promisify(execFile);

// Número "Melo". Producción, CONNECTED, verificado.
const PHONE_NUMBER_ID = "1243233552205505";
const KAPSO = join(process.env.HOME, "Library", "pnpm", "kapso");

/**
 * ponytail: el envío va por el CLI de Kapso en vez de su API HTTP. Reusa la
 * sesión ya autenticada y no mete un token más en el repo. El techo es obvio
 * —un proceso por mensaje, no aguanta miles de suscriptores— y el día que
 * estorbe se cambia por un POST a la API con una API key.
 */
async function enviarWhatsapp(telefono, texto) {
  const { stdout } = await ejecutar(KAPSO, [
    "whatsapp", "messages", "send",
    "--phone-number-id", PHONE_NUMBER_ID,
    "--to", telefono,
    "--text", texto,
    "--output", "json",
  ]);
  return JSON.parse(stdout).messages?.[0]?.id;
}

export async function revisarYAlertar({ seco = false, desdeMinutos = 90 } = {}) {
  const suscriptores = await leerSuscriptores();
  if (suscriptores.length === 0) {
    console.log("No hay suscriptores todavía.");
    return [];
  }

  // Clave evento+teléfono: si a alguien ya se le avisó de este sismo, no se
  // le repite aunque el USGS revise la magnitud diez veces (y lo hace).
  const enviados = await leerEnviados();
  const nuevos = [];
  const sismos = clasificarReplicas(
    await sismosRecientes({ desdeMinutos, magnitudMinima: 2.5 })
  );
  const resultados = [];

  // El tsunami se consulta una vez, no una por suscriptor: es el mismo
  // boletín para toda la costa.
  const avisosTsunami = await avisosParaColombia().catch((e) => {
    // Que el PTWC falle no puede tumbar las alertas sísmicas.
    console.warn(`PTWC no respondió: ${e.message}`);
    return [];
  });

  for (const sus of suscriptores) {
    const lugar = normalizarMunicipio(sus.municipio);
    if (!lugar) {
      console.warn(`Municipio desconocido para ${sus.telefono}: ${sus.municipio}`);
      continue;
    }

    // Tsunami primero y sin agrupar con nada: es el único aviso de este
    // sistema donde la persona todavía puede moverse a tiempo.
    if (lugar.costaPacifica) {
      for (const aviso of avisosTsunami) {
        const clave = `tsunami:${aviso.boletinUrl}:${sus.telefono}`;
        if (enviados.has(clave)) continue;

        const texto = mensajeTsunami(aviso, lugar);
        if (seco) {
          console.log(`[seco] → ${sus.telefono} (${lugar.nombre}) TSUNAMI ${aviso.categoria}`);
          console.log(texto.replace(/^/gm, "    "), "\n");
        } else {
          const wamid = await enviarWhatsapp(sus.telefono, texto);
          console.log(`→ ${sus.telefono} (${lugar.nombre}) TSUNAMI ${aviso.categoria} · ${wamid}`);
          enviados.add(clave);
          nuevos.push(clave);
        }
        resultados.push({ telefono: sus.telefono, ids: [clave], etiqueta: "tsunami" });
      }
    }

    // Solo lo que esta persona no ha recibido y de verdad sintió.
    const pendientes = sismos.filter(
      (s) => !enviados.has(`${s.id}:${sus.telefono}`) && evaluarAlerta(s, lugar).alertar
    );
    if (pendientes.length === 0) continue;

    // Los principales van uno por uno: cada sismo grande es su propia noticia.
    // Las réplicas van juntas en un solo mensaje.
    const principales = pendientes.filter((s) => !s.replicaDe);
    const replicas = pendientes.filter((s) => s.replicaDe);

    const envios = principales.map((s) => ({
      texto: evaluarAlerta(s, lugar).mensaje,
      ids: [s.id],
      etiqueta: `M${s.magnitud}`,
    }));

    if (replicas.length > 0) {
      envios.push({
        texto: mensajeReplicas(replicas, lugar),
        ids: replicas.map((s) => s.id),
        etiqueta: `${replicas.length} réplica(s)`,
      });
    }

    for (const envio of envios) {
      if (seco) {
        console.log(`[seco] → ${sus.telefono} (${lugar.nombre}) ${envio.etiqueta}`);
        console.log(envio.texto.replace(/^/gm, "    "), "\n");
      } else {
        const wamid = await enviarWhatsapp(sus.telefono, envio.texto);
        console.log(`→ ${sus.telefono} (${lugar.nombre}) ${envio.etiqueta} · ${wamid}`);
        envio.ids.forEach((id) => {
          enviados.add(`${id}:${sus.telefono}`);
          nuevos.push(`${id}:${sus.telefono}`);
        });
      }
      resultados.push({ telefono: sus.telefono, ids: envio.ids, etiqueta: envio.etiqueta });
    }
  }

  if (!seco) await marcarEnviados(nuevos);
  if (resultados.length === 0) console.log("Nada que alertar.");
  return resultados;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // --desde <minutos> permite reproducir un evento real para la demo.
  const i = process.argv.indexOf("--desde");
  await revisarYAlertar({
    seco: process.argv.includes("--seco"),
    desdeMinutos: i > -1 ? Number(process.argv[i + 1]) : 90,
  });
}
