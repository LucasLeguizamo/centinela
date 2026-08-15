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

  // Por archivo y no por `--stdin`: execFile no escribe en la entrada del
  // proceso hijo (eso es execFileSync), así que el CLI se quedaba esperando
  // stdin para siempre y el envío colgaba sin error.
  const ruta = join(tmpdir(), `centinela-${telefono}-${payload.template.name}.json`);
  await writeFile(ruta, JSON.stringify(payload));

  const { stdout } = await ejecutar(KAPSO, [
    "whatsapp", "messages", "send",
    "--phone-number-id", PHONE_NUMBER_ID,
    "--input", ruta,
    "--output", "json",
  ]);

  await rm(ruta, { force: true });
  return JSON.parse(stdout).messages?.[0]?.id;
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
