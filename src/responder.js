// US-008: responder preguntas de seguimiento con datos reales.
//
// Una alerta que no se puede repreguntar es un volante. La ventaja de
// WhatsApp sobre una app es justamente ésta: la persona contesta el mensaje
// como le contestaría a un conocido, y el sistema responde con el dato.
//
//   node src/responder.js --seco    → clasifica y muestra, sin enviar
//   node src/responder.js           → responde de verdad

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import {
  sismosRecientes,
  clasificarReplicas,
  evaluarAlerta,
  intensidadEn,
  describirIntensidad,
  normalizarMunicipio,
  MUNICIPIOS,
} from "./sismos.js";
import {
  leerSuscriptores,
  leerRespondidos,
  marcarRespondidos,
  buscarRecursos,
} from "./db.js";

const ejecutar = promisify(execFile);

const PHONE_NUMBER_ID = "1243233552205505";
const KAPSO = join(process.env.HOME, "Library", "pnpm", "kapso");

function sinAcentos(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Clasificación por palabras clave, no por modelo.
 *
 * Son ocho intenciones y la gente las escribe casi igual siempre. Un LLM acá
 * costaría plata y latencia para adivinar lo que un `test` resuelve, y sobre
 * todo abriría la puerta a que el bot invente una dirección: por este camino
 * todo dato concreto sale de una consulta, no de un modelo.
 *
 * ponytail: el techo sigue ahí y ahora está más cerca. Estas ocho cubren la
 * pregunta directa ("dónde llevo la ayuda") pero no la abierta ("junté ropa
 * usada y pañales, ¿me sirve de algo?"). Eso pide un clasificador de verdad
 * con tool-calling sobre estas mismas consultas — el modelo redacta, las
 * herramientas responden.
 */
export function clasificarIntencion(texto) {
  const t = sinAcentos(texto);

  // La baja gana sobre todo lo demás: si alguien quiere irse, se va.
  if (/\b(baja|cancelar|parar|stop|no quiero)\b/.test(t)) return "baja";
  if (/\b(cambiar|mudar|otra ciudad|me mude)\b/.test(t)) return "cambiar";

  // De lo más específico a lo más general: "donar sangre" es sangre, "donar
  // plata" es dinero, y "donar" a secas es llevar cosas a un acopio, que es
  // lo que la gente quiere decir la mayoría de las veces.
  if (/\bsangre\b|hemocentro|banco de sangre/.test(t)) return "sangre";
  if (
    // Los verbos van con sufijo abierto: la gente escribe "transfiero",
    // "consigno" y "giro", no el infinitivo del diccionario.
    /(donar|dono|donacion|aportar|transfer\w*|consign\w*)[^.]{0,25}(plata|dinero|efectivo|pesos|cuenta)/.test(t) ||
    /(plata|dinero|efectivo)[^.]{0,25}(donar|dono|aportar|transfer\w*|consign\w*|cuenta)/.test(t) ||
    /\bcuenta\b[^.]{0,25}(transfer\w*|consign\w*|donar|plata|dinero)/.test(t) ||
    /\b(nequi|daviplata|bancolombia|bre ?-?b|cuenta bancaria|numero de cuenta)\b/.test(t)
  )
    return "donar";
  if (
    /\bacopios?\b|punto de (acopio|recoleccion)/.test(t) ||
    /donde (los |las |la |lo )?(llevo|llevar|dono|donar|entrego|entregar|dejo|dejar)/.test(t) ||
    /que (puedo |se |les |)(donar|dona|reciben|recibe|sirve)/.test(t) ||
    /(donde|como) (puedo )?ayudar|quiero ayudar|llevar (comida|ropa|mercado|ayudas?)/.test(t)
  )
    return "acopio";

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

/** Fecha corta para citar cuándo se verificó un dato. */
function fechaCorta(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short" });
}

/**
 * Una ficha de recurso, en el formato que WhatsApp lee bien.
 *
 * Siempre lleva fuente y fecha de verificación. No es adorno: la mitad de las
 * preguntas que llegan son "¿esto es real?", y en una emergencia donde ya hay
 * campañas falsas circulando, un dato sin procedencia vale menos que ninguno.
 */
function ficha(r) {
  const lineas = [`*${r.nombre}*${r.verificado ? " ✓" : ""}`];

  if (r.descripcion) lineas.push(`_${r.descripcion}_`);
  if (r.direccion) lineas.push(`📍 ${r.direccion}`);
  if (r.distancia_km != null) lineas.push(`📏 a ${r.distancia_km} km de vos`);
  if (r.horario) lineas.push(`🕐 ${r.horario}`);
  if (r.urgente?.length) lineas.push(`🔴 Más urgente: ${r.urgente.slice(0, 3).join(", ")}`);
  else if (r.acepta?.length) lineas.push(`📦 Recibe: ${r.acepta.slice(0, 4).join(", ")}`);
  if (r.telefono) lineas.push(`📞 +${r.telefono}`);

  const verificado = fechaCorta(r.verificado_en);
  if (verificado) lineas.push(`Verificado el ${verificado} · ${r.fuente}`);

  return lineas.join("\n");
}

/**
 * Recursos cerca, ampliando el radio antes de rendirse.
 *
 * 25 km sirve dentro de una ciudad; 80 km alcanza al municipio vecino, que es
 * lo que necesita alguien en un pueblo donde no hay acopio propio. Decir "no
 * hay nada" cuando lo hay a 40 km sería el peor resultado posible.
 */
async function recursosCerca(tipo, lugar) {
  for (const radioKm of [25, 80]) {
    const hallados = await buscarRecursos({
      tipo,
      lat: lugar.lat,
      lon: lugar.lon,
      radioKm,
      limite: 3,
    });
    if (hallados.length > 0) return { hallados, radioKm };
  }
  return { hallados: [], radioKm: 80 };
}

export async function componerRespuesta(intencion, lugar) {
  if (intencion === "acopio") {
    const { hallados, radioKm } = await recursosCerca("acopio", lugar);

    if (hallados.length === 0) {
      return (
        `No tengo ningún centro de acopio verificado a menos de ${radioKm} km de ${lugar.nombre}.\n\n` +
        `El directorio completo, con 145 centros en 27 departamentos, está en:\n` +
        `https://emergency-rosy.vercel.app\n\n` +
        `Si conocés uno que falte, ahí mismo se puede registrar.`
      );
    }

    return (
      `Esto es lo que tengo cerca de ${lugar.nombre}:\n\n` +
      hallados.map(ficha).join("\n\n") +
      `\n\nAntes de salir, llamá para confirmar que siguen recibiendo: los horarios cambian de un día para otro.\n\n` +
      `Directorio completo: https://emergency-rosy.vercel.app`
    );
  }

  if (intencion === "sangre") {
    const { hallados } = await recursosCerca("sangre", lugar);

    if (hallados.length === 0) {
      return (
        `Todavía no tengo bancos de sangre cargados para ${lugar.nombre}. No te mando a una dirección que no pueda confirmar.\n\n` +
        `Los puntos y jornadas verificados están acá:\n` +
        `https://cuidarcolombia.vercel.app\n\n` +
        `Dos cosas que sirven: la sangre se necesita durante semanas, no solo los primeros días, y conviene llamar antes porque muchas jornadas se llenan.`
      );
    }

    return (
      `Donación de sangre cerca de ${lugar.nombre}:\n\n` +
      hallados.map(ficha).join("\n\n") +
      `\n\nLlamá antes de ir: las jornadas se llenan y los horarios cambian.\n\n` +
      `Más puntos verificados: https://cuidarcolombia.vercel.app`
    );
  }

  if (intencion === "donar") {
    const { hallados } = await recursosCerca("donacion", lugar);

    // Regla dura: el bot no dicta números de cuenta.
    //
    // Ya hay campañas falsas suplantando entidades por WhatsApp y SMS, y un
    // bot que recita una cuenta es el vector perfecto. Nombramos la
    // organización y mandamos a su sitio oficial, donde el número está bajo
    // el control de quien recibe la plata. Si el dato viaja por acá, tarde o
    // temprano viaja uno equivocado.
    const canales = hallados.length
      ? hallados.map(ficha).join("\n\n")
      : [
          "• *Cruz Roja Colombiana*\n  https://www.cruzrojacolombiana.org",
          "• *Fundación PLAN*\n  https://fundacionplan.org",
          "• *Bancos de Alimentos ABACO*\n  https://bancosdealimentos.org.co",
        ].join("\n\n");

    return (
      `Para donar dinero, andá siempre a la página oficial de la organización y sacá el dato de ahí:\n\n` +
      canales +
      `\n\n⚠️ No te fíes de cuentas que te lleguen por WhatsApp o SMS, ni siquiera si vienen reenviadas por alguien conocido. La Policía ya alertó de campañas falsas que suplantan entidades.\n\n` +
      `Yo nunca te voy a mandar un número de cuenta: si te llega uno a mi nombre, no soy yo.`
    );
  }

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
      "Te aviso cuando tiemble en tu ciudad y te digo qué tan fuerte se sintió *ahí*. " +
      "Y si querés ayudar, te digo dónde llevar las cosas.\n\n" +
      "Podés escribirme:\n" +
      "• *dónde dono* — centros de acopio cerca tuyo\n" +
      "• *donar sangre* — puntos y jornadas\n" +
      "• *donar dinero* — canales oficiales verificados\n" +
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
  const suscriptores = await leerSuscriptores();
  const respondidos = await leerRespondidos();
  const mensajes = await entrantesRecientes();

  const nuevos = [];
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
      nuevos.push(m.id);
    }
    atendidos++;
  }

  if (!seco) await marcarRespondidos(nuevos);
  if (atendidos === 0) console.log("Nada que responder.");
  return atendidos;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await atenderPreguntas({ seco: process.argv.includes("--seco") });
}
