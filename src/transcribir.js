// Las notas de voz entran por la misma puerta que el texto.
//
// No es un lujo: después de un sismo la gente manda audios porque tiene las
// manos ocupadas, está a oscuras o está nerviosa. Hoy el bot los descarta en
// silencio, que es la peor forma de fallar —la persona cree que preguntó.
//
// Se transcribe con Scribe de ElevenLabs y el texto sigue el camino de
// siempre: clasificarIntencion() no sabe ni le importa si vino escrito o
// hablado.

const CLAVE = process.env.ELEVENLABS_API_KEY;
const TOKEN_META = process.env.WHATSAPP_TOKEN;

const GRAPH = "https://graph.facebook.com/v21.0";
const SCRIBE = "https://api.elevenlabs.io/v1/speech-to-text";

/**
 * ponytail: `scribe_v1`, el modelo estable, y el idioma clavado en español.
 * Una nota de voz de tres segundos con ruido de fondo es justo el caso donde
 * la detección automática de idioma se equivoca, y "temblor" detectado como
 * portugués vuelve basura la transcripción. El techo: si algún día escribe
 * alguien en wayuunaiki o en inglés, esto lo fuerza a español igual.
 */
const MODELO = "scribe_v1";
const IDIOMA = "spa";

/** WhatsApp no acepta audios de más de 16 MB, así que nada legítimo pesa más. */
const MAX_BYTES = 16 * 1024 * 1024;

/**
 * Qué se acepta como transcripción utilizable.
 *
 * Un audio inaudible no devuelve error: devuelve texto vacío o dos sílabas
 * sueltas. Eso no se puede clasificar y contestarle un menú a ese ruido es
 * peor que decir "no te escuché".
 */
export function interpretar(json) {
  const texto = (json?.text ?? "").replace(/\s+/g, " ").trim();
  if (texto.length < 3) return null;

  // language_probability baja = el modelo no reconoció español, casi siempre
  // porque era ruido. Con el idioma forzado igual devuelve algo, y ese algo
  // suele ser inventado.
  if (typeof json.language_probability === "number" && json.language_probability < 0.5) {
    return null;
  }
  return { texto, idioma: json.language_code ?? IDIOMA };
}

/**
 * Baja el audio de una nota de voz entrante.
 *
 * El CLI de Kapso no expone media, así que se va directo a Graph. Son dos
 * saltos porque la API de Meta los obliga: primero se pide la metadata del
 * media id, que devuelve una URL firmada, y esa URL vive cinco minutos y
 * además exige el mismo Bearer. No es una URL pública.
 */
export async function descargarAudio(mediaId) {
  if (!TOKEN_META) throw new Error("falta WHATSAPP_TOKEN para bajar el audio");
  const cabeceras = { authorization: `Bearer ${TOKEN_META}` };

  const meta = await fetch(`${GRAPH}/${mediaId}`, { headers: cabeceras });
  if (!meta.ok) throw new Error(`Graph ${meta.status} pidiendo el media ${mediaId}`);
  const { url, mime_type, file_size } = await meta.json();

  if (file_size > MAX_BYTES) throw new Error(`audio de ${file_size} bytes, demasiado grande`);

  const bin = await fetch(url, { headers: cabeceras });
  if (!bin.ok) throw new Error(`Graph ${bin.status} bajando el audio`);

  return { bytes: Buffer.from(await bin.arrayBuffer()), mime: mime_type ?? "audio/ogg" };
}

export async function transcribir(bytes, mime = "audio/ogg") {
  if (!CLAVE) throw new Error("falta ELEVENLABS_API_KEY");

  const formulario = new FormData();
  // WhatsApp manda las notas de voz en Opus dentro de Ogg. El nombre del
  // archivo es lo único que le dice a Scribe qué está recibiendo.
  formulario.append("file", new Blob([bytes], { type: mime }), "nota.ogg");
  formulario.append("model_id", MODELO);
  formulario.append("language_code", IDIOMA);

  const r = await fetch(SCRIBE, {
    method: "POST",
    headers: { "xi-api-key": CLAVE },
    body: formulario,
  });

  const json = await r.json();
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${json?.detail?.message ?? "sin detalle"}`);
  return interpretar(json);
}

/**
 * De un mensaje entrante de WhatsApp al texto que dijo la persona.
 *
 * Devuelve null en cualquier tropiezo —sin clave, sin red, audio mudo— y
 * quien llama decide qué contestar. Nunca lanza: que ElevenLabs esté caído
 * no puede tumbar el ciclo de respuestas de todos los demás.
 */
export async function textoDeAudio(mensaje) {
  const mediaId = mensaje.audio?.id ?? mensaje.voice?.id;
  if (!mediaId) return null;

  try {
    const { bytes, mime } = await descargarAudio(mediaId);
    return await transcribir(bytes, mime);
  } catch (e) {
    console.warn(`No se pudo transcribir el audio de ${mensaje.from}: ${e.message}`);
    return null;
  }
}
