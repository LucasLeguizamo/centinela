// El clasificador que entra cuando las palabras clave se rinden.
//
// `clasificarIntencion()` resuelve la pregunta directa ("dónde llevo la
// ayuda"). La abierta no: "junté ropa usada y pañales de mi hija, ¿le sirve
// eso a alguien?" no contiene ninguna de las palabras que busca el regex, y
// hoy cae en "desconocida" —que contesta el detalle del último sismo. La
// persona preguntó una cosa y le llegó otra.
//
// Acá el modelo hace UNA sola cosa: elegir un id de la lista. No redacta la
// respuesta, no nombra un lugar, no dicta una dirección ni una cuenta. Con el
// id elegido responde el mismo código de siempre, con datos de la base. Es la
// diferencia entre un modelo que traduce la pregunta y uno que inventa la
// respuesta.

const CLAVE = process.env.OPENROUTER_API_KEY;
const API = "https://openrouter.ai/api/v1/chat/completions";

/**
 * ponytail: un modelo chico y barato. Esto es clasificación de una frase corta
 * en 14 opciones, no razonamiento. El techo: si aparecen categorías mucho más
 * finas, sube el modelo por env sin tocar código.
 */
const MODELO = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";

/** Segundos que se espera. Alguien esperando después de un sismo no espera más. */
const TIMEOUT_MS = 8000;

/** Nada legítimo es más largo; el resto es ruido o un reenvío pegado. */
const MAX_CARACTERES = 600;

/**
 * Las únicas salidas válidas. Cada una tiene ya su respuesta escrita en
 * `responder.js`: el modelo no puede pedir una que no sepamos contestar.
 */
export const INTENCIONES = [
  "acopio",
  "donar",
  "sangre",
  "voluntariado",
  "alojamiento_ofrecer",
  "alojamiento_necesito",
  "buscar_persona",
  "mascota",
  "necesito_dinero",
  "reportar_dano",
  "detalle",
  "replicas",
  "menu_ayudar",
  "menu_necesito",
];

const INSTRUCCIONES = `Clasificas mensajes de WhatsApp que le llegan a un bot de emergencias sísmicas en Colombia.

Respondé con UNA sola palabra: el id que mejor describe qué necesita la persona, o "ninguna".

acopio — quiere entregar cosas físicas: ropa, mercado, agua, pañales, cobijas, colchonetas. O pregunta si algo que tiene sirve.
donar — quiere dar plata. Incluye "aportar", "colaborar con algo", "mandar una ayuda", transferencias, y a quien pregunta desde otro país cómo contribuir.
sangre — donar sangre. En Colombia "jornada de donación" casi siempre es de sangre.
voluntariado — ofrece algo suyo concreto: una profesión, un oficio, un estudio, un vehículo, horas de su semana.
alojamiento_ofrecer — tiene un espacio para prestar
alojamiento_necesito — se quedó sin dónde dormir, o pregunta por albergues y refugios
buscar_persona — busca o reporta a alguien: no contesta, no aparece, no saben de él
mascota — busca o reporta un animal
necesito_dinero — es damnificado y lo que necesita es plata
reportar_dano — su casa o edificio quedó dañado, agrietado, torcido, o pregunta si es seguro
detalle — pregunta por el sismo: qué pasó, qué tan fuerte, por qué, dónde
replicas — pregunta si hubo, hay o habrá réplicas. También si siente que sigue temblando.
menu_ayudar — quiere ayudar pero NO dice con qué. "Quiero servir", "en lo que sea", "en qué necesitan manos".
menu_necesito — necesita ayuda pero NO dice de qué. "Estamos mal", "qué opciones hay".

Tres reglas de desempate:
1. Si dice con QUÉ quiere ayudar, usá esa categoría. Si solo dice que quiere ayudar, es menu_ayudar. Lo mismo del otro lado con menu_necesito.
2. Si menciona varias necesidades, elegí la más urgente en lo físico: dónde dormir antes que plata, una persona perdida antes que un daño material.
3. Ante la duda entre una categoría y "ninguna", elegí la categoría. Contestarle de más a alguien que preguntó otra cosa se arregla repreguntando; no reconocer a alguien que pidió ayuda, no.

Si de verdad no encaja en ninguna —un saludo, un agradecimiento, un emoji, una cadena reenviada, un insulto—: "ninguna".
No expliques. No agregues nada. Solo la palabra.`;

/**
 * Qué se acepta como clasificación.
 *
 * Un modelo devuelve "acopio.", "**acopio**" o "Creo que es acopio" según el
 * día. Se limpia y se exige que esté en la lista: lo que no reconocemos es
 * "no sé", nunca una categoría parecida.
 */
export function interpretar(json) {
  const bruto = json?.choices?.[0]?.message?.content ?? "";
  const id = bruto.toLowerCase().replace(/[^a-z_]/g, "");
  return INTENCIONES.includes(id) ? id : null;
}

/**
 * De una pregunta abierta a un id de intención, o null.
 *
 * Nunca lanza. Sin clave, sin red, con OpenRouter caído o con un modelo que
 * contesta cualquier cosa, devuelve null y quien llama sigue con lo que ya
 * tenía. Que el clasificador esté caído no puede tumbar el ciclo de
 * respuestas de todos los demás.
 */
export async function entender(texto) {
  if (!CLAVE || !texto?.trim()) return null;

  try {
    const r = await fetch(API, {
      method: "POST",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        authorization: `Bearer ${CLAVE}`,
        "content-type": "application/json",
        // OpenRouter los usa para atribuir el tráfico en su ranking público.
        "HTTP-Referer": "https://centinela.vercel.app",
        "X-Title": "Centinela",
      },
      body: JSON.stringify({
        model: MODELO,
        // Determinista: la misma pregunta tiene que caer siempre en la misma
        // categoría, si no el bot contesta distinto a dos personas iguales.
        temperature: 0,
        max_tokens: 10,
        messages: [
          { role: "system", content: INSTRUCCIONES },
          { role: "user", content: texto.trim().slice(0, MAX_CARACTERES) },
        ],
      }),
    });

    const json = await r.json();
    if (!r.ok) throw new Error(`OpenRouter ${r.status}: ${json?.error?.message ?? "sin detalle"}`);
    return interpretar(json);
  } catch (e) {
    console.warn(`No se pudo clasificar con el modelo: ${e.message}`);
    return null;
  }
}
