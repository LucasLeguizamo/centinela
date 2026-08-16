// El canal de respaldo cuando WhatsApp no pasa.
//
// Aclaración honesta: el SMS viaja por las mismas antenas que los datos. Si
// la celda se cayó, tampoco llega. Lo que sí resuelve son los dos casos
// reales de un sismo: señal degradada (el SMS entra con una barra y sin
// datos, por el canal de control) y red congestionada (el operador lo
// guarda y reintenta durante horas; WhatsApp falla en el intento y ya).
//
// Para el caso "no hay red en absoluto" no existe respuesta de software:
// eso es cell broadcast, y en Colombia lo opera el Estado con los
// operadores, no una app.

const { TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM } = process.env;

/**
 * ponytail: Twilio por HTTP directo, sin el SDK. Son diez líneas de fetch y
 * una dependencia menos. El techo es el precio —unos USD 0.05 por SMS a
 * Colombia— y el día que el volumen duela se cambia el cuerpo de esta
 * función por un agregador local (Hablame, Masiv), que cobra ~10x menos.
 * Nadie afuera de este archivo sabe quién manda el SMS.
 */
const API = "https://api.twilio.com/2010-04-01";

const TILDES = { á: "a", é: "e", í: "i", ó: "o", ú: "u", Á: "A", É: "E", Í: "I", Ó: "O", Ú: "U" };

/**
 * Un SMS "normal" son 160 caracteres porque usa el alfabeto GSM-7. Una sola
 * tilde fuera de ese alfabeto lo pasa a UCS-2 y el límite cae a 70: la
 * alerta se parte en dos mensajes que pueden llegar en desorden o llegar a
 * medias. Se quitan las tildes; la ñ y la ü sí están en GSM-7 y se quedan,
 * que "ano" y "año" no son lo mismo.
 */
export function aGsm(texto) {
  return texto.replace(/[áéíóúÁÉÍÓÚ]/g, (c) => TILDES[c]);
}

/** Un SMS, un cobro: se recorta a 160 y se avisa con "..." que hay más. */
export function recortar(texto, limite = 160) {
  const plano = aGsm(texto).replace(/\s+/g, " ").trim();
  return plano.length <= limite ? plano : plano.slice(0, limite - 3) + "...";
}

export async function enviarSms(telefono, texto) {
  if (!TWILIO_SID) throw new Error("SMS sin configurar: falta TWILIO_SID en el entorno");

  const r = await fetch(`${API}/Accounts/${TWILIO_SID}/Messages.json`, {
    method: "POST",
    headers: {
      authorization:
        "Basic " + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64"),
      "content-type": "application/x-www-form-urlencoded",
    },
    // Los teléfonos se guardan en E.164 sin '+', como los entrega Kapso.
    body: new URLSearchParams({
      From: TWILIO_FROM,
      To: `+${telefono}`,
      Body: recortar(texto),
    }),
  });

  const j = await r.json();
  if (!r.ok) throw new Error(`Twilio ${r.status}: ${j.message ?? "sin detalle"}`);
  return j.sid;
}
