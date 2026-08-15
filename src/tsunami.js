// US-010: aviso de tsunami en el Pacífico colombiano.
//
// Es el único caso de este proyecto con ventaja de tiempo real. Un sismo de
// subducción frente a Nariño da entre 20 y 40 minutos antes de que el agua
// toque Tumaco; el boletín del PTWC sale en menos de diez. Ahí los dos
// minutos de latencia de WhatsApp dejan de importar y empiezan a servir.
//
// Tumaco tiene precedente: en 1979 un M8.2 generó un tsunami que mató a
// cientos de personas en la costa nariñense.

const PTWC = "https://www.tsunami.gov/events/xml/PHEBAtom.xml";

// El PTWC clasifica sus boletines en cuatro niveles. "Information" significa
// explícitamente que NO hay amenaza: nunca se reenvía, porque un aviso que
// llega sin que haya peligro entrena a la gente a ignorar el siguiente.
const CATEGORIAS_PELIGRO = ["warning", "advisory", "watch"];

const NIVELES = {
  warning: {
    titulo: "🌊 ALERTA DE TSUNAMI",
    accion: "Alejate de la playa y subí a terreno alto AHORA. No esperes a ver el mar.",
  },
  advisory: {
    titulo: "🌊 AVISO DE TSUNAMI",
    accion: "Salí del agua y alejate de playas, muelles y desembocaduras. Puede haber corrientes peligrosas.",
  },
  watch: {
    titulo: "🌊 VIGILANCIA DE TSUNAMI",
    accion: "Todavía no hay orden de evacuar, pero mantenete atento y listo para subir a terreno alto.",
  },
};

function extraer(patron, texto) {
  const m = texto.match(patron);
  return m ? m[1].trim() : null;
}

/** Boletines vigentes del Pacific Tsunami Warning Center. */
export async function boletinesPTWC() {
  const res = await fetch(PTWC);
  if (!res.ok) throw new Error(`PTWC respondió ${res.status}`);
  const xml = await res.text();

  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, entrada]) => ({
    region: extraer(/<title>([\s\S]*?)<\/title>/, entrada),
    actualizado: extraer(/<updated>(.*?)<\/updated>/, entrada),
    lat: Number(extraer(/<geo:lat>(.*?)<\/geo:lat>/, entrada)),
    lon: Number(extraer(/<geo:long>(.*?)<\/geo:long>/, entrada)),
    categoria: (extraer(/<strong>Category:<\/strong>\s*(\w+)/, entrada) || "").toLowerCase(),
    magnitud: extraer(/Preliminary Magnitude:\s*<\/strong>\s*([\d.]+)/, entrada),
    boletinUrl: extraer(/href="([^"]*\.txt)"/, entrada),
  }));
}

/**
 * ¿Este boletín nombra a Colombia entre las costas amenazadas?
 *
 * Se consulta el boletín oficial en texto plano en vez de adivinar por
 * distancia al epicentro: la propagación de un tsunami depende de la
 * batimetría y de la orientación de la falla, no del radio. El PTWC ya hizo
 * ese cálculo; nosotros leemos su conclusión.
 */
export async function amenazaColombia(boletin) {
  if (!CATEGORIAS_PELIGRO.includes(boletin.categoria)) return false;
  if (!boletin.boletinUrl) return false;

  const res = await fetch(boletin.boletinUrl);
  if (!res.ok) return false;
  const texto = (await res.text()).toUpperCase();

  return texto.includes("COLOMBIA");
}

export function mensajeTsunami(boletin, lugar) {
  const nivel = NIVELES[boletin.categoria] ?? NIVELES.watch;
  const magnitud = boletin.magnitud ? ` tras un sismo M${boletin.magnitud}` : "";

  return (
    `${nivel.titulo} — ${lugar.nombre}\n\n` +
    `El Centro de Alerta de Tsunamis del Pacífico emitió un boletín${magnitud} en ${boletin.region}.\n\n` +
    `⚠️ ${nivel.accion}\n\n` +
    `Seguí las indicaciones de la autoridad local por encima de este mensaje.\n\n` +
    `Boletín oficial:\n${boletin.boletinUrl}`
  );
}

/** Boletines vigentes que amenazan a Colombia, ya filtrados. */
export async function avisosParaColombia() {
  const boletines = await boletinesPTWC();
  const amenazantes = [];

  for (const b of boletines) {
    if (await amenazaColombia(b)) amenazantes.push(b);
  }
  return amenazantes;
}
