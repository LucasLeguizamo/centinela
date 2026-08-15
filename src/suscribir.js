// Cierra el lazo entre el workflow de onboarding y el motor de alertas.
//
// El workflow de Kapso conversa y confirma, pero esa confirmación vive en
// Kapso. Sin este sincronizador, alguien se suscribe, recibe "quedaste
// suscrito ✅" y no le llega nunca nada: la peor falla posible, porque es
// silenciosa y del lado de quien confió.
//
//   node src/suscribir.js --seco   → muestra qué haría
//   node src/suscribir.js          → escribe data/suscriptores.json

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { entrantes } from "./whatsapp.js";
import { normalizarMunicipio, MUNICIPIOS } from "./sismos.js";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const SUSCRIPTORES = join(RAIZ, "data", "suscriptores.json");

/**
 * De un mensaje entrante, ¿qué ciudad eligió la persona?
 *
 * Cubre las dos formas: la selección de la lista interactiva (trae el id
 * exacto, siempre válido) y el texto escrito a mano, porque la gente
 * responde igual aunque le hayas mandado botones.
 */
export function ciudadDeMensaje(mensaje) {
  const seleccion =
    mensaje.interactive?.list_reply?.id ??
    mensaje.interactive?.button_reply?.id ??
    null;

  if (seleccion && MUNICIPIOS[seleccion]) {
    return { clave: seleccion, ...MUNICIPIOS[seleccion] };
  }

  const texto = mensaje.text?.body ?? mensaje.kapso?.content ?? "";
  return texto ? normalizarMunicipio(texto) : null;
}

export async function sincronizar({ seco = false } = {}) {
  let suscriptores = [];
  try {
    suscriptores = JSON.parse(await readFile(SUSCRIPTORES, "utf8"));
  } catch {
    // Todavía no hay archivo: primera corrida.
  }

  const porTelefono = new Map(suscriptores.map((s) => [s.telefono, s]));
  const mensajes = await entrantes(48);

  // Del más viejo al más nuevo: si alguien cambió de ciudad dos veces, gana
  // la última.
  mensajes.sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

  const cambios = [];

  for (const m of mensajes) {
    const texto = (m.text?.body ?? m.kapso?.content ?? "").trim().toLowerCase();

    // La baja manda sobre todo lo demás y se procesa aunque venga junto a
    // otra cosa: si alguien quiere irse, se va.
    if (/\b(baja|cancelar|parar|stop)\b/.test(texto)) {
      if (porTelefono.delete(m.from)) cambios.push(`− ${m.from} se dio de baja`);
      continue;
    }

    const ciudad = ciudadDeMensaje(m);
    if (!ciudad) continue;

    const actual = porTelefono.get(m.from);
    if (actual?.municipio === ciudad.nombre) continue;

    porTelefono.set(m.from, {
      telefono: m.from,
      municipio: ciudad.nombre,
      alta: actual?.alta ?? new Date(Number(m.timestamp) * 1000).toISOString().slice(0, 10),
    });
    cambios.push(actual ? `~ ${m.from} → ${ciudad.nombre}` : `+ ${m.from} → ${ciudad.nombre}`);
  }

  const resultado = [...porTelefono.values()];

  if (cambios.length === 0) {
    console.log(`Sin cambios. ${resultado.length} suscriptor(es).`);
    return resultado;
  }

  cambios.forEach((c) => console.log(c));

  if (seco) {
    console.log(`[seco] quedarían ${resultado.length} suscriptor(es).`);
  } else {
    await mkdir(dirname(SUSCRIPTORES), { recursive: true });
    await writeFile(SUSCRIPTORES, JSON.stringify(resultado, null, 2));
    console.log(`${resultado.length} suscriptor(es) guardados.`);
  }

  return resultado;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await sincronizar({ seco: process.argv.includes("--seco") });
}
