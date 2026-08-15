// US-005: del sismo detectado al WhatsApp entregado.
//
// Corre cada minuto: pregunta al USGS, evalúa la intensidad para cada
// suscriptor en su municipio, y le escribe solo a quien de verdad lo sintió.

import {
  sismosRecientes,
  evaluarAlerta,
  normalizarMunicipio,
  clasificarReplicas,
  mensajeReplicas,
} from "./sismos.js";
import { avisosParaColombia, mensajeTsunami } from "./tsunami.js";
import { leerSuscriptores, leerEnviados, marcarEnviados } from "./db.js";
import { enviarTexto, enviarAlertaSismica, ventanasAbiertas } from "./whatsapp.js";

/** Las cinco variables de la plantilla UTILITY `alerta_sismica`. */
function plantillaDe(sismo, lugar) {
  return {
    magnitud: sismo.magnitud,
    epicentro: sismo.lugar,
    hora: sismo.hora.toLocaleTimeString("es-CO", { timeZone: "America/Bogota" }),
    profundidad: Math.round(sismo.profundidadKm),
    intensidad: describirIntensidad(intensidadEn(sismo, lugar)).etiqueta,
  };
}

export async function revisarYAlertar({ seco = false, desdeMinutos = 90 } = {}) {
  const suscriptores = await leerSuscriptores();
  if (suscriptores.length === 0) {
    console.log("No hay suscriptores todavía.");
    return [];
  }

  // Clave evento+teléfono: si a alguien ya se le avisó de este sismo, no se
  // le repite aunque el USGS revise la magnitud diez veces (y lo hace).
  const enviados = await leerEnviados();
  const nuevos = [];
  const sismos = clasificarReplicas(
    await sismosRecientes({ desdeMinutos, magnitudMinima: 2.5 })
  );
  const resultados = [];

  // Quién tiene la ventana de 24 h abierta. Fuera de ella solo pasa la
  // plantilla UTILITY aprobada.
  const abiertas = await ventanasAbiertas();

  // El tsunami se consulta una vez, no una por suscriptor: es el mismo
  // boletín para toda la costa.
  const avisosTsunami = await avisosParaColombia().catch((e) => {
    // Que el PTWC falle no puede tumbar las alertas sísmicas.
    console.warn(`PTWC no respondió: ${e.message}`);
    return [];
  });

  for (const sus of suscriptores) {
    const lugar = normalizarMunicipio(sus.municipio);
    if (!lugar) {
      console.warn(`Municipio desconocido para ${sus.telefono}: ${sus.municipio}`);
      continue;
    }

    // Tsunami primero y sin agrupar con nada: es el único aviso de este
    // sistema donde la persona todavía puede moverse a tiempo.
    if (lugar.costaPacifica) {
      for (const aviso of avisosTsunami) {
        const clave = `tsunami:${aviso.boletinUrl}:${sus.telefono}`;
        if (enviados.has(clave)) continue;

        const texto = mensajeTsunami(aviso, lugar);
        if (seco) {
          console.log(`[seco] → ${sus.telefono} (${lugar.nombre}) TSUNAMI ${aviso.categoria}`);
          console.log(texto.replace(/^/gm, "    "), "\n");
        } else {
          // No hay plantilla UTILITY de tsunami aprobada, así que fuera de
          // la ventana se degrada a la de sismo, que sí pasa. Es peor mandar
          // un aviso imperfecto que no mandarlo.
          const wamid = abiertas.has(sus.telefono)
            ? await enviarTexto(sus.telefono, texto)
            : await enviarAlertaSismica(sus.telefono, {
                magnitud: aviso.magnitud ?? "—",
                epicentro: `TSUNAMI · ${aviso.region}`,
                hora: "ver boletin",
                profundidad: "—",
                intensidad: "AMENAZA DE TSUNAMI, subi a terreno alto",
              });
          console.log(`→ ${sus.telefono} (${lugar.nombre}) TSUNAMI ${aviso.categoria} · ${wamid}`);
          enviados.add(clave);
          nuevos.push(clave);
        }
        resultados.push({ telefono: sus.telefono, ids: [clave], etiqueta: "tsunami" });
      }
    }

    // Solo lo que esta persona no ha recibido y de verdad sintió.
    const pendientes = sismos.filter(
      (s) => !enviados.has(`${s.id}:${sus.telefono}`) && evaluarAlerta(s, lugar).alertar
    );
    if (pendientes.length === 0) continue;

    // Los principales van uno por uno: cada sismo grande es su propia noticia.
    // Las réplicas van juntas en un solo mensaje.
    const principales = pendientes.filter((s) => !s.replicaDe);
    const replicas = pendientes.filter((s) => s.replicaDe);

    const envios = principales.map((s) => ({
      texto: evaluarAlerta(s, lugar).mensaje,
      sismo: s,
      ids: [s.id],
      etiqueta: `M${s.magnitud}`,
    }));

    if (replicas.length > 0) {
      envios.push({
        texto: mensajeReplicas(replicas, lugar),
        ids: replicas.map((s) => s.id),
        etiqueta: `${replicas.length} réplica(s)`,
      });
    }

    for (const envio of envios) {
      if (seco) {
        console.log(`[seco] → ${sus.telefono} (${lugar.nombre}) ${envio.etiqueta}`);
        console.log(envio.texto.replace(/^/gm, "    "), "\n");
      } else {
        const abierta = abiertas.has(sus.telefono);
        const wamid = abierta
          ? await enviarTexto(sus.telefono, envio.texto)
          : await enviarAlertaSismica(sus.telefono, plantillaDe(envio.sismo ?? pendientes[0], lugar));
        const via = abierta ? "texto" : "plantilla";
        console.log(`→ ${sus.telefono} (${lugar.nombre}) ${envio.etiqueta} · ${via} · ${wamid}`);
        envio.ids.forEach((id) => {
          enviados.add(`${id}:${sus.telefono}`);
          nuevos.push(`${id}:${sus.telefono}`);
        });
      }
      resultados.push({ telefono: sus.telefono, ids: envio.ids, etiqueta: envio.etiqueta });
    }
  }

  if (!seco) await marcarEnviados(nuevos);
  if (resultados.length === 0) console.log("Nada que alertar.");
  return resultados;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // --desde <minutos> permite reproducir un evento real para la demo.
  const i = process.argv.indexOf("--desde");
  await revisarYAlertar({
    seco: process.argv.includes("--seco"),
    desdeMinutos: i > -1 ? Number(process.argv[i + 1]) : 90,
  });
}
