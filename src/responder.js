// US-008: responder preguntas de seguimiento con datos reales.
//
// Una alerta que no se puede repreguntar es un volante. La ventaja de
// WhatsApp sobre una app es justamente ésta: la persona contesta el mensaje
// como le contestaría a un conocido, y el sistema responde con el dato.
//
//   node src/responder.js --seco    → clasifica y muestra, sin enviar
//   node src/responder.js           → responde de verdad

import { execFile } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { promisify } from "node:util";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  sismosRecientes,
  clasificarReplicas,
  evaluarAlerta,
  intensidadEn,
  describirIntensidad,
  normalizarMunicipio,
  MUNICIPIOS,
} from "./sismos.js";

const ejecutar = promisify(execFile);
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const SUSCRIPTORES = join(RAIZ, "data", "suscriptores.json");
const RESPONDIDOS = join(RAIZ, "data", "respondidos.json");

const PHONE_NUMBER_ID = "1243233552205505";
const KAPSO = join(process.env.HOME, "Library", "pnpm", "kapso");

async function leerJson(ruta, porDefecto) {
  try {
    return JSON.parse(await readFile(ruta, "utf8"));
  } catch {
    return porDefecto;
  }
}

async function escribirJson(ruta, valor) {
  await mkdir(dirname(ruta), { recursive: true });
  await writeFile(ruta, JSON.stringify(valor, null, 2));
}

function sinAcentos(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Clasificación por palabras clave, no por modelo.
 *
 * ponytail: son cinco intenciones y la gente las escribe casi igual siempre.
 * Un LLM acá costaría plata y latencia para adivinar lo que un `includes`
 * resuelve. El techo: en cuanto aparezca una sexta intención o la gente
 * empiece a preguntar cosas abiertas, esto pasa a ser un clasificador de
 * verdad y el fallback deja de alcanzar.
 */
export function clasificarIntencion(texto) {
  const t = sinAcentos(texto);

  if (/\b(baja|cancelar|parar|stop|no quiero)\b/.test(t)) return "baja";
  if (/\b(cambiar|mudar|otra ciudad|me mude)\b/.test(t)) return "cambiar";
  if (/\b(replica|replicas|volvio a temblar|otra vez)\b/.test(t)) return "replicas";
  if (/(que tan fuerte|cuanto fue|magnitud|que paso|que fue eso|temblo|tembl)/.test(t))
    return "detalle";
  if (/\b(ayuda|help|que haces|como funciona|opciones|hola|buenas|menu)\b/.test(t))
    return "ayuda";

  return "desconocida";
}

/** Última alerta relevante para esa ciudad, con su intensidad local. */
async function contextoSismico(lugar) {
  const sismos = clasificarReplicas(
    await sismosRecientes({ desdeMinutos: 7 * 24 * 60, magnitudMinima: 2.5 })
  );
  const sentidos = sismos.filter((s) => evaluarAlerta(s, lugar).alertar);
  const principal = sentidos.filter((s) => !s.replicaDe).at(-1);
  const replicas = principal ? sentidos.filter((s) => s.replicaDe === principal.id) : [];
  return { principal, replicas };
}

export async function componerRespuesta(intencion, lugar) {
  if (intencion === "baja") {
    return (
      "Listo, no te escribo más. 👋\n\n" +
      "Si algún día querés volver, escribime y te suscribo otra vez en un mensaje."
    );
  }

  if (intencion === "cambiar") {
    const ciudades = Object.values(MUNICIPIOS)
      .map((c) => c.nombre)
      .join(", ");
    return `Decime en qué ciudad estás ahora y la cambio.\n\nPor ahora cubro: ${ciudades}.`;
  }

  if (intencion === "ayuda") {
    return (
      "Te aviso cuando tiemble en tu ciudad y te digo qué tan fuerte se sintió *ahí*.\n\n" +
      "Podés escribirme:\n" +
      "• *qué tan fuerte fue* — detalle del último sismo\n" +
      "• *réplicas* — si hubo réplicas y cuántas\n" +
      "• *cambiar* — para cambiar de ciudad\n" +
      "• *baja* — para dejar de recibir alertas\n\n" +
      "Un recordatorio: el aviso te llega después del temblor, no antes."
    );
  }

  const { principal, replicas } = await contextoSismico(lugar);

  if (!principal) {
    return `En los últimos 7 días no hubo ningún sismo que se sintiera en ${lugar.nombre}. Todo tranquilo por allá.`;
  }

  // toLocaleString ya cierra con punto ("7:34 a. m."); no agregar otro.
  const cuando = principal.hora.toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  });

  if (intencion === "replicas") {
    if (replicas.length === 0) {
      return (
        `Después del sismo M${principal.magnitud} del ${cuando} no ha habido réplicas que se sintieran en ${lugar.nombre}.\n\n` +
        `Si viene alguna, te aviso.`
      );
    }
    const mayor = replicas.reduce((a, b) => (b.magnitud > a.magnitud ? b : a));
    return (
      `Sí: ${replicas.length} réplica(s) del sismo M${principal.magnitud} del ${cuando}. La mayor fue M${mayor.magnitud}.\n\n` +
      `Las réplicas son normales y van bajando de intensidad con el tiempo.`
    );
  }

  // detalle / desconocida → el dato útil por defecto
  const alerta = evaluarAlerta(principal, lugar);
  const mmi = intensidadEn(principal, lugar);

  return (
    `El último que se sintió en ${lugar.nombre} fue un M${principal.magnitud} el ${cuando}\n\n` +
    `📍 Epicentro: ${principal.lugar}\n` +
    `📏 A ${alerta.distanciaKm} km de vos, ${Math.round(principal.profundidadKm)} km de profundidad\n` +
    `💥 En ${lugar.nombre} se sintió *${describirIntensidad(mmi).etiqueta}*\n\n` +
    (replicas.length > 0 ? `Después vinieron ${replicas.length} réplica(s).\n\n` : "") +
    `La magnitud (M${principal.magnitud}) es del sismo; lo que sentiste depende de qué tan lejos y qué tan hondo fue.\n\n` +
    `Fuente: USGS\n${principal.url}`
  );
}

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

async function entrantesRecientes(horas = 24) {
  const desde = new Date(Date.now() - horas * 3_600_000).toISOString();
  const { stdout } = await ejecutar(KAPSO, [
    "whatsapp", "messages", "list",
    "--phone-number-id", PHONE_NUMBER_ID,
    "--direction", "inbound",
    "--since", desde,
    "--limit", "50",
    "--output", "json",
  ]);
  return JSON.parse(stdout).data ?? [];
}

export async function atenderPreguntas({ seco = false } = {}) {
  const suscriptores = await leerJson(SUSCRIPTORES, []);
  const respondidos = new Set(await leerJson(RESPONDIDOS, []));
  const mensajes = await entrantesRecientes();

  let atendidos = 0;

  for (const m of mensajes) {
    if (respondidos.has(m.id)) continue;

    const texto = m.text?.body;
    if (!texto) continue;

    // Solo contestamos a quien ya está suscrito: los nuevos los atiende el
    // workflow de onboarding, y responder los dos sería hablar encima.
    const sus = suscriptores.find((s) => s.telefono === m.from);
    if (!sus) continue;

    const lugar = normalizarMunicipio(sus.municipio);
    if (!lugar) continue;

    const intencion = clasificarIntencion(texto);
    const respuesta = await componerRespuesta(intencion, lugar);

    if (seco) {
      console.log(`[seco] ${m.from} · "${texto}" → ${intencion}`);
      console.log(respuesta.replace(/^/gm, "    "), "\n");
    } else {
      const wamid = await enviarWhatsapp(m.from, respuesta);
      console.log(`→ ${m.from} · "${texto}" → ${intencion} · ${wamid}`);
      respondidos.add(m.id);
    }
    atendidos++;
  }

  if (!seco) await escribirJson(RESPONDIDOS, [...respondidos]);
  if (atendidos === 0) console.log("Nada que responder.");
  return atendidos;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await atenderPreguntas({ seco: process.argv.includes("--seco") });
}
