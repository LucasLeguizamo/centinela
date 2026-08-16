// Todo lo que toca WhatsApp vive acá, para que el resto del código no sepa
// que Kapso existe.

import { execFile } from "node:child_process";
import { writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { join } from "node:path";

const ejecutar = promisify(execFile);

// Número "Melo". Producción, CONNECTED, verificado.
export const PHONE_NUMBER_ID = "1243233552205505";

/**
 * ponytail: se habla con Kapso por su CLI en vez de por su API HTTP. Reusa
 * la sesión ya autenticada y no mete un token más en el repo. El techo es
 * obvio —un proceso por llamada, no aguanta miles de suscriptores— y el día
 * que estorbe se cambia por un POST con API key.
 */
const KAPSO = join(process.env.HOME, "Library", "pnpm", "kapso");

async function kapso(args) {
  const { stdout } = await ejecutar(KAPSO, [...args, "--output", "json"]);
  return JSON.parse(stdout);
}

export async function enviarTexto(telefono, texto) {
  const r = await kapso([
    "whatsapp", "messages", "send",
    "--phone-number-id", PHONE_NUMBER_ID,
    "--to", telefono,
    "--text", texto,
  ]);
  return r.messages?.[0]?.id;
}

/**
 * Cualquier payload de la Cloud API que el CLI no tenga como atajo.
 *
 * Por archivo y no por `--stdin`: execFile no escribe en la entrada del
 * proceso hijo (eso es execFileSync), así que el CLI se quedaba esperando
 * stdin para siempre y el envío colgaba sin error.
 */
async function enviarPayload(telefono, payload, etiqueta) {
  const ruta = join(tmpdir(), `centinela-${telefono}-${etiqueta}.json`);
  await writeFile(ruta, JSON.stringify(payload));

  try {
    const { stdout } = await ejecutar(KAPSO, [
      "whatsapp", "messages", "send",
      "--phone-number-id", PHONE_NUMBER_ID,
      "--input", ruta,
      "--output", "json",
    ]);
    return JSON.parse(stdout).messages?.[0]?.id;
  } finally {
    await rm(ruta, { force: true });
  }
}

/**
 * Texto con hasta 3 botones.
 *
 * Un botón es un toque; escribir la palabra exacta es una barrera, sobre todo
 * después de un sismo y sobre todo para quien no usa el teléfono todo el día.
 * Los títulos son las mismas frases que reconoce `clasificarIntencion`: al
 * tocarlos WhatsApp los manda como texto y entran por el camino de siempre.
 */
export async function enviarBotones(telefono, { texto, botones, pie }) {
  return enviarPayload(
    telefono,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: telefono,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: texto },
        ...(pie ? { footer: { text: pie } } : {}),
        action: {
          // Meta corta en 20 caracteres sin avisar y el botón queda ilegible.
          buttons: botones.slice(0, 3).map((b) => ({
            type: "reply",
            reply: { id: b.id, title: b.titulo.slice(0, 20) },
          })),
        },
      },
    },
    "botones"
  );
}

/**
 * Texto con un botón que abre una página.
 *
 * WhatsApp permite un solo botón de URL por mensaje (`cta_url`), así que se lo
 * lleva el recurso principal y los demás quedan como enlaces en el cuerpo.
 * Un botón evita el paso de copiar y pegar, que es donde la gente se cae.
 */
export async function enviarEnlace(telefono, { texto, url, etiqueta, pie }) {
  return enviarPayload(
    telefono,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: telefono,
      type: "interactive",
      interactive: {
        type: "cta_url",
        body: { text: texto },
        ...(pie ? { footer: { text: pie } } : {}),
        action: {
          name: "cta_url",
          parameters: { display_text: etiqueta.slice(0, 20), url },
        },
      },
    },
    "enlace"
  );
}

/** Lista de opciones: hasta 10 filas en total, repartidas en secciones. */
export async function enviarLista(telefono, { titulo, texto, pie, botonLista, secciones }) {
  return enviarPayload(
    telefono,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: telefono,
      type: "interactive",
      interactive: {
        type: "list",
        ...(titulo ? { header: { type: "text", text: titulo } } : {}),
        body: { text: texto },
        ...(pie ? { footer: { text: pie } } : {}),
        action: {
          button: botonLista,
          sections: secciones.map((s) => ({
            title: s.titulo,
            rows: s.filas.map((f) => ({
              id: f.id,
              title: f.titulo.slice(0, 24),
              description: f.detalle,
            })),
          })),
        },
      },
    },
    "lista"
  );
}

/**
 * Plantilla UTILITY `alerta_sismica`, aprobada por Meta.
 *
 * Es la única vía para escribirle a alguien que lleva más de 24 h sin
 * contestar. Las plantillas MARKETING no sirven: Meta las bloquea con el
 * error 131049 contra usuarios sin historial reciente.
 */
export async function enviarAlertaSismica(telefono, { magnitud, epicentro, hora, profundidad, intensidad }) {
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: telefono,
    type: "template",
    template: {
      name: "alerta_sismica",
      language: { code: "es" },
      components: [
        {
          type: "body",
          parameters: [magnitud, epicentro, hora, profundidad, intensidad].map((t) => ({
            type: "text",
            // Las plantillas de WhatsApp rechazan saltos de línea y espacios
            // dobles dentro de una variable.
            text: String(t).replace(/\s+/g, " ").trim(),
          })),
        },
      ],
    },
  };

  return enviarPayload(telefono, payload, payload.template.name);
}

export async function entrantes(horas = 48) {
  const desde = new Date(Date.now() - horas * 3_600_000).toISOString();
  const r = await kapso([
    "whatsapp", "messages", "list",
    "--phone-number-id", PHONE_NUMBER_ID,
    "--direction", "inbound",
    "--since", desde,
    "--limit", "100",
  ]);
  return r.data ?? [];
}

/**
 * Teléfonos con la ventana de 24 h abierta.
 *
 * Dentro de la ventana se puede mandar texto libre, gratis y sin aprobación.
 * Fuera, solo plantillas. La ventana la abre la persona, nunca nosotros.
 */
export async function ventanasAbiertas() {
  const limite = Date.now() - 24 * 3_600_000;
  const abiertas = new Set();

  for (const m of await entrantes(25)) {
    if (Number(m.timestamp) * 1000 >= limite) abiertas.add(m.from);
  }
  return abiertas;
}
