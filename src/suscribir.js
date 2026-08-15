// Cierra el lazo entre el workflow de onboarding y el motor de alertas.
//
// El workflow de Kapso conversa y confirma, pero esa confirmación vive en
// Kapso. Sin este sincronizador alguien se suscribe, recibe "quedaste
// suscrito ✅" y no le llega nunca nada: la peor falla posible, porque es
// silenciosa y cae del lado de quien confió.
//
//   node src/suscribir.js --seco   → muestra qué haría
//   node src/suscribir.js          → guarda de verdad

import { entrantes } from "./whatsapp.js";
import { leerSuscriptores, guardarSuscriptor, borrarSuscriptor } from "./db.js";
import { normalizarMunicipio, MUNICIPIOS } from "./sismos.js";

/**
 * De un mensaje entrante, ¿qué ciudad eligió la persona?
 *
 * Cubre las dos formas: la selección de la lista interactiva (trae el id
 * exacto, siempre válido) y el texto escrito a mano, porque la gente
 * responde escribiendo aunque le hayas mandado botones.
 */
export function ciudadDeMensaje(mensaje) {
  const seleccion =
    mensaje.interactive?.list_reply?.id ?? mensaje.interactive?.button_reply?.id ?? null;

  if (seleccion && MUNICIPIOS[seleccion]) {
    return { clave: seleccion, ...MUNICIPIOS[seleccion] };
  }

  const texto = mensaje.text?.body ?? mensaje.kapso?.content ?? "";
  return texto ? normalizarMunicipio(texto) : null;
}

export async function sincronizar({ seco = false } = {}) {
  const actuales = new Map((await leerSuscriptores()).map((s) => [s.telefono, s]));
  const mensajes = await entrantes(48);

  // Del más viejo al más nuevo: si alguien cambió de ciudad dos veces, gana
  // la última.
  mensajes.sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

  const cambios = [];

  for (const m of mensajes) {
    const texto = (m.text?.body ?? m.kapso?.content ?? "").trim().toLowerCase();

    // La baja manda sobre todo lo demás: si alguien quiere irse, se va.
    if (/\b(baja|cancelar|parar|stop)\b/.test(texto)) {
      if (actuales.has(m.from)) {
        actuales.delete(m.from);
        if (!seco) await borrarSuscriptor(m.from);
        cambios.push(`− ${m.from} se dio de baja`);
      }
      continue;
    }

    const ciudad = ciudadDeMensaje(m);
    if (!ciudad) continue;

    const previo = actuales.get(m.from);
    if (previo?.municipio === ciudad.nombre) continue;

    actuales.set(m.from, { telefono: m.from, municipio: ciudad.nombre });
    if (!seco) await guardarSuscriptor({ telefono: m.from, municipio: ciudad.nombre });
    cambios.push(`${previo ? "~" : "+"} ${m.from} → ${ciudad.nombre}`);
  }

  if (cambios.length === 0) {
    console.log(`Sin cambios. ${actuales.size} suscriptor(es).`);
  } else {
    cambios.forEach((c) => console.log(c));
    console.log(`${seco ? "[seco] quedarían" : ""} ${actuales.size} suscriptor(es).`.trim());
  }

  return [...actuales.values()];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await sincronizar({ seco: process.argv.includes("--seco") });
}
