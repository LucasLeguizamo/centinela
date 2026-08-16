// US-008: responder preguntas de seguimiento con datos reales.
//
// Una alerta que no se puede repreguntar es un volante. La ventaja de
// WhatsApp sobre una app es justamente ésta: la persona contesta el mensaje
// como le contestaría a un conocido, y el sistema responde con el dato.
//
//   node src/responder.js --seco    → clasifica y muestra, sin enviar
//   node src/responder.js           → responde una vez
//
// Para que conteste solo, sin que nadie lo ejecute: `node src/vigilar.js`.

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
import { enviarTexto, enviarLista, enviarEnlace, entrantes } from "./whatsapp.js";
import { textoDeAudio } from "./transcribir.js";
import { entender } from "./entender.js";
import {
  MENUS,
  ORGANIZACIONES,
  TIPO_RECURSO,
  sitiosPara,
  sitiosExterior,
  sitiosDeCategoria,
  describirCobertura,
} from "./directorio.js";


function sinAcentos(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Categorías de ayuda, en orden de especificidad.
 *
 * Cada patrón reconoce dos cosas a la vez: cómo lo escribe la gente por su
 * cuenta ("donde llevo el mercado") y el título exacto del botón del menú
 * ("Llevar cosas"). Es lo que permite que los botones de WhatsApp y el texto
 * libre entren por la misma puerta: al tocar una fila de la lista, WhatsApp
 * manda su título como si la persona lo hubiera escrito.
 */
const CATEGORIAS = [
  ["sangre", /\bsangre\b|hemocentro|donar sangre/],

  ["mascota", /\bmascotas?\b|\bperr[oa]s?\b|\bgat[oa]s?\b|perdi mi (perro|gato|mascota)/],

  ["buscar_persona",
    /desaparecid|buscar a (alguien|mi|una persona)|no encuentro a|estoy buscando a|reportar una persona/],

  ["alojamiento_necesito",
    /necesito (donde |un |)(dormir|alojamiento|techo|posada)|me quede sin casa|perdi mi casa|donde duermo/],

  ["alojamiento_ofrecer",
    /ofrecer (alojamiento|techo|casa|habitacion)|tengo (un |una |)(espacio|habitacion|apartamento|casa) (libre|disponible|vacia)|puedo alojar/],

  ["necesito_dinero",
    /necesito (ayuda economica|plata|dinero)|publicar mi caso|soy damnificad|quede sin nada/],

  ["reportar_dano",
    /reportar (danos?|mi casa|el edificio)|mi (casa|edificio|apartamento) (se |quedo |esta )?(agrieto|agrietad|dañad|danad|con grietas)|grietas/],

  ["voluntariado",
    /voluntari|ser volunta|poner (mi |el )?tiempo|ayudar con mis manos|soy (ingenier|arquitect|medic|psicolog)/],

  ["donar",
    // Verbos con sufijo abierto: la gente escribe "transfiero" y "consigno",
    // no el infinitivo del diccionario.
    /donar dinero|(donar|dono|donacion|aportar|transfer\w*|consign\w*)[^.]{0,25}(plata|dinero|efectivo|pesos|cuenta)|(plata|dinero|efectivo)[^.]{0,25}(donar|dono|aportar|transfer\w*|consign\w*|cuenta)|\bcuenta\b[^.]{0,25}(transfer\w*|consign\w*|donar|plata|dinero)|\b(nequi|daviplata|bancolombia|bre ?-?b|cuenta bancaria|numero de cuenta)\b/],

  ["acopio",
    /\bacopios?\b|punto de (acopio|recoleccion)|llevar cosas|donde (los |las |la |lo )?(llevo|llevar|dono|donar|entrego|entregar|dejo|dejar)|que (puedo |se |les |)(donar|dona|reciben|recibe|sirve)|llevar (comida|ropa|mercado|ayudas?)/],
];

/** Todas las categorías que menciona un mensaje, no solo la primera. */
export function categoriasEn(texto) {
  const t = sinAcentos(texto);
  return CATEGORIAS.filter(([, patron]) => patron.test(t)).map(([id]) => id);
}

/**
 * Clasificación por palabras clave, no por modelo.
 *
 * La gente escribe estas cosas casi igual siempre. Un LLM acá costaría plata
 * y latencia para adivinar lo que un `test` resuelve, y sobre todo abriría la
 * puerta a que el bot invente una dirección: por este camino todo dato
 * concreto sale de una consulta, no de un modelo.
 *
 * Esto cubre la pregunta directa ("dónde llevo la ayuda") pero no la abierta
 * ("junté ropa usada y pañales, ¿me sirve de algo?"). Para eso está
 * `entender()` en `entender.js`, que solo entra cuando acá no matchea nada:
 * el modelo elige la categoría, este código sigue respondiendo con los datos.
 */
export function clasificarIntencion(texto) {
  const t = sinAcentos(texto);

  // La baja gana sobre todo lo demás: si alguien quiere irse, se va.
  if (/\b(baja|cancelar|parar|stop|no quiero)\b/.test(t)) return "baja";
  if (/\b(cambiar|mudar|otra ciudad|me mude)\b/.test(t)) return "cambiar";

  // Los dos menús van antes que las categorías: "necesito ayuda" es una
  // puerta, no una pregunta concreta, y contiene la palabra "ayuda" que si no
  // se la llevaría el menú general.
  // "Necesito ayuda" abre el menú; "necesito ayuda económica" ya es una
  // categoría concreta y sería un paso de más mandarla al menú.
  if (/necesito ayuda(?!\s*(economica|economico|con plata|con dinero))|necesito apoyo|^necesito$/.test(t))
    return "menu_necesito";
  if (/quiero ayudar|como (puedo )?ayudar|en que (puedo )?ayudar|donde (puedo )?ayudar|^ayudar$/.test(t))
    return "menu_ayudar";

  const categorias = categoriasEn(t);
  if (categorias.length > 1) return "varias";
  if (categorias.length === 1) return categorias[0];

  if (/\b(replica|replicas|volvio a temblar|otra vez)\b/.test(t)) return "replicas";
  if (/(que tan fuerte|cuanto fue|magnitud|que paso|que fue eso|temblo|tembl)/.test(t))
    return "detalle";
  // El menú general es un cajón de sastre: cualquiera de estas palabras lo
  // dispara. Por eso solo vale en mensajes cortos, que es como llega de
  // verdad ("hola", "menú", "ver opciones"). En una frase larga la palabra
  // aparece de paso —"estamos mal, qué opciones hay"— y quedarse con ella
  // sería tirar todo el resto del mensaje, que es justo donde está el pedido.
  if (t.trim().split(/\s+/).length <= 4 &&
      /\b(ayuda|help|que haces|como funciona|opciones|hola|buenas|menu)\b/.test(t))
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
  if (r.distancia_km != null) lineas.push(`📏 a ${r.distancia_km} km de ti`);
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

/** Encabezado y cierre propios de cada categoría. */
const TEXTOS = {
  acopio: {
    conLugares: (l) => `Esto es lo que tengo cerca de ${l.nombre}:`,
    cierre: "Antes de salir, llamá para confirmar que siguen recibiendo: los horarios cambian de un día para otro.",
    sinLugares: (l) => `No tengo ningún centro de acopio verificado cerca de ${l.nombre}, pero acá puedes buscar en todo el país:`,
  },
  sangre: {
    conLugares: (l) => `Donación de sangre cerca de ${l.nombre}:`,
    cierre: "Llamá antes de ir: las jornadas se llenan. Y la sangre se necesita durante semanas, no solo los primeros días.",
    sinLugares: (l) => `Todavía no tengo bancos de sangre cargados para ${l.nombre}, y no te mando a una dirección que no pueda confirmar. Acá están los puntos y jornadas verificados:`,
  },
  voluntariado: {
    sinLugares: () => "Para poner el tiempo o el oficio:",
    cierre: "Si eres ingeniero, arquitecto o estudiante de esas áreas, dilo al registrarte: hay convocatorias específicas para evaluar estructuras.",
  },
  alojamiento_ofrecer: {
    sinLugares: () => "Para ofrecer un espacio a alguien que perdió su casa:",
  },
  alojamiento_necesito: {
    conLugares: (l) => `Albergues cerca de ${l.nombre}:`,
    sinLugares: () => "Para conseguir alojamiento temporal:",
  },
  buscar_persona: {
    sinLugares: () => "Para buscar o reportar a una persona:",
    cierre: "Registrá el caso en las dos primeras: son las que más gente consulta y no comparten información entre sí, así que estar en una sola reduce las probabilidades.",
  },
  mascota: {
    sinLugares: () => "Para buscar o reportar una mascota:",
  },
  necesito_dinero: {
    sinLugares: () => "Para publicar tu caso y recibir ayuda directa:",
    cierre: "Ahí la plata llega a tu propia cuenta: la plataforma no la recibe ni la administra.",
  },
  reportar_dano: {
    sinLugares: () => "Para reportar daños en tu casa o edificio:",
    cierre: "Reportarlo sirve para dos cosas: que quede registro y que las cuadrillas de evaluación sepan dónde ir.",
  },
};

/** Una web del directorio, en el formato que WhatsApp lee bien. */
function fichaSitio(s) {
  return `• *${s.nombre}*\n  ${s.que}\n  ${s.url}`;
}

/**
 * Respuesta de una categoría, con la regla que pediste:
 * primero un sitio físico al que se pueda ir, y solo si no hay ninguno cerca,
 * la web que sí cubre esa zona.
 */
async function responderCategoria(categoria, lugar) {
  const textos = TEXTOS[categoria] ?? {};
  const tipo = TIPO_RECURSO[categoria];

  // ¿Hay lugares físicos raspados para esta categoría y cerca de la persona?
  if (tipo) {
    const { hallados } = await recursosCerca(tipo, lugar);
    if (hallados.length > 0) {
      const sitios = sitiosPara(categoria, lugar);
      return (
        `${textos.conLugares(lugar)}\n\n` +
        hallados.map(ficha).join("\n\n") +
        (textos.cierre ? `\n\n${textos.cierre}` : "") +
        (sitios.length ? `\n\nVer todos: ${sitios[0].url}` : "")
      );
    }
  }

  // No hay dónde ir: a la web, pero solo a la que sirve donde está.
  const sitios = sitiosPara(categoria, lugar);

  if (sitios.length === 0) {
    // No hay nada que cubra su zona. Antes de rendirse: decirle qué existe y
    // hasta dónde llega. "Existe pero no llega a ti" es información útil;
    // el silencio lo deja pensando que lo suyo no le sirve a nadie.
    const nombres = Object.fromEntries(
      Object.entries(MUNICIPIOS).map(([clave, m]) => [clave, m.nombre])
    );
    const otras = sitiosDeCategoria(categoria).map(
      (s) => `${fichaSitio(s)}\n  ⚠️ Por ahora solo cubre ${describirCobertura(s, nombres)}`
    );
    const fuera = sitiosExterior(categoria).map(fichaSitio);

    if (otras.length === 0 && fuera.length === 0) {
      return (
        `Todavía no tengo nada verificado de eso para ${lugar.nombre}, y prefiero decírtelo a mandarte a un sitio que no te sirva.\n\n` +
        `Escríbeme más adelante: estoy sumando fuentes nuevas cada día.`
      );
    }

    return (
      `No tengo nada que cubra ${lugar.nombre} para eso todavía. Te digo lo que hay, por si te sirve o conocés a alguien en esas zonas:\n\n` +
      [...otras, ...fuera].join("\n\n") +
      `\n\nSi aparece algo para ${lugar.nombre}, lo sumo.`
    );
  }

  return (
    `${textos.sinLugares(lugar)}\n\n` +
    sitios.map(fichaSitio).join("\n\n") +
    (textos.cierre ? `\n\n${textos.cierre}` : "")
  );
}

/**
 * Los tres menús como lista tocable.
 *
 * Las 10 filas de WhatsApp alcanzan justo para las dos puertas juntas, así que
 * "ayuda" no necesita un paso intermedio: se ve todo y se toca una.
 */
export function menuLista(intencion) {
  const seccion = (menu) => ({
    titulo: menu.titulo,
    filas: menu.opciones.map((o) => ({ id: o.id, titulo: o.titulo, detalle: o.detalle })),
  });

  const secciones =
    intencion === "menu_ayudar"
      ? [seccion(MENUS.ayudar)]
      : intencion === "menu_necesito"
        ? [seccion(MENUS.necesito)]
        // Quien pide ayuda a secas ve las dos puertas. La de "necesito" va
        // primera: al que la está pasando mal no se le hace scrollear entre
        // opciones de donación.
        : [seccion(MENUS.necesito), seccion(MENUS.ayudar)];

  return {
    titulo: "¿Con qué te ayudo?",
    texto:
      "Elige una y te digo a dónde ir, lo más cerca que tenga de donde estás.\n\n" +
      "También puedes escribirme *qué tan fuerte fue*, *réplicas*, *cambiar* de ciudad o *baja*.",
    pie: "El aviso te llega después del temblor, no antes",
    botonLista: "Ver opciones",
    secciones,
  };
}

/** Menú como texto, para el caso en que no llegue por botón. */
function menuTexto(menu) {
  return (
    `${menu.titulo}\n\n` +
    menu.opciones.map((o) => `• *${o.titulo}* — ${o.detalle}`).join("\n") +
    `\n\nEscribime la que necesites. Puedes pedirme varias a la vez.`
  );
}

/**
 * Qué escribió la persona, haya escrito o tocado.
 *
 * Un toque en una lista o un botón no trae `text.body`: llega como
 * `interactive.list_reply` con el título de la fila. Sin esto el bot ignoraba
 * en silencio todos los botones que él mismo mandó, que es la peor forma de
 * quedarse callado.
 */
export function textoDeMensaje(m) {
  const seleccion = m.interactive?.list_reply ?? m.interactive?.button_reply ?? null;
  return m.text?.body ?? seleccion?.title ?? null;
}

/** El cuerpo interactivo de WhatsApp se corta en 1024 caracteres. */
const TOPE_CUERPO = 1024;

/**
 * Recorta la respuesta a lo que entra en un mensaje, por fichas enteras.
 *
 * Cortar por caracteres deja una dirección a medias o un enlace partido, que
 * es peor que no darlo: la persona sale igual hacia un lugar que no existe.
 * Acá se sacan recursos completos desde el final —los primeros son los más
 * relevantes— y se avisa cuántos quedaron afuera.
 */
export function recortar(respuesta, tope = TOPE_CUERPO) {
  if (respuesta.length <= tope) return respuesta;

  const bloques = respuesta.split("\n\n");
  let sobrantes = 0;

  // Solo se sacan fichas de recursos, nunca las frases que explican ni las
  // advertencias: la de las cuentas falsas es lo único que separa a alguien de
  // mandarle plata a un estafador, y sobra siempre que se pueda dar un dato
  // menos en vez de esa línea.
  const esFicha = (b) => b.startsWith("•");

  for (let i = bloques.length - 1; i >= 0 && bloques.join("\n\n").length > tope - 60; i--) {
    if (!esFicha(bloques[i])) continue;
    bloques.splice(i, 1);
    sobrantes++;
  }

  const aviso = sobrantes
    ? `\n\n(Tengo ${sobrantes === 1 ? "uno más" : `${sobrantes} más`}: pídemelo y te lo paso.)`
    : "";

  return (bloques.join("\n\n") + aviso).slice(0, tope);
}

/**
 * El primer recurso de una respuesta, para ponerle un botón que lo abra.
 *
 * Devuelve la etiqueta del botón —el nombre de la organización si entra en los
 * 20 caracteres que deja WhatsApp— y su enlace. Null si la respuesta no lleva
 * enlaces o es demasiado larga para un mensaje interactivo: en ese caso sale
 * como texto, donde los enlaces igual se pueden tocar.
 */
export function primerEnlace(respuesta) {
  if (respuesta.length > TOPE_CUERPO) return null;

  const url = respuesta.match(/https?:\/\/\S+/)?.[0];
  if (!url) return null;

  const nombre = respuesta.slice(0, respuesta.indexOf(url)).match(/\*([^*]+)\*(?![\s\S]*\*[^*]+\*)/)?.[1];
  return { url, etiqueta: nombre && nombre.length <= 20 ? nombre : "Abrir la página" };
}

export async function componerRespuesta(intencion, lugar, texto = "") {
  if (intencion === "menu_ayudar") return menuTexto(MENUS.ayudar);
  if (intencion === "menu_necesito") return menuTexto(MENUS.necesito);

  // Varias categorías en un mismo mensaje ("sangre y ropa"): se responden
  // todas. Obligar a preguntar de a una convierte una conversación en un
  // formulario.
  if (intencion === "varias") {
    const partes = [];
    for (const categoria of categoriasEn(texto)) {
      partes.push(await responderCategoria(categoria, lugar));
    }
    return partes.join("\n\n———\n\n");
  }

  if (intencion === "donar") {
    // Regla dura: el bot no dicta números de cuenta.
    //
    // Ya hay campañas falsas suplantando entidades por WhatsApp y SMS, y un
    // bot que recita una cuenta es el vector perfecto. Nombramos la
    // organización y mandamos a su sitio oficial, donde el número está bajo
    // el control de quien recibe la plata. Si el dato viaja por acá, tarde o
    // temprano viaja uno equivocado.
    const sitios = sitiosPara("donar", lugar);

    return (
      `Para donar dinero, andá siempre a la página oficial y sacá el dato de ahí:\n\n` +
      ORGANIZACIONES.map((o) => `• *${o.nombre}*\n  ${o.url}`).join("\n\n") +
      (sitios.length
        ? `\n\nY estas dos verifican los canales de mucha más gente:\n\n${sitios.map(fichaSitio).join("\n\n")}`
        : "") +
      `\n\n⚠️ No te fíes de cuentas que te lleguen por WhatsApp o SMS, ni siquiera reenviadas por alguien conocido. La Policía ya alertó de campañas falsas que suplantan entidades.\n\n` +
      `Yo nunca te voy a mandar un número de cuenta: si te llega uno a mi nombre, no soy yo.`
    );
  }

  if (TEXTOS[intencion]) return responderCategoria(intencion, lugar);

  if (intencion === "baja") {
    return (
      "Listo, no te escribo más. 👋\n\n" +
      "Si algún día quieres volver, escribime y te suscribo otra vez en un mensaje."
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
      "Y te conecto con la ayuda, para los dos lados:\n\n" +
      "• *QUIERO AYUDAR* — llevar cosas, donar, sangre, voluntariado, alojamiento\n" +
      "• *NECESITO AYUDA* — buscar a alguien, mascota perdida, dónde dormir, reportar daños\n\n" +
      "También puedes escribirme directo:\n" +
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
    `📏 A ${alerta.distanciaKm} km de ti, ${Math.round(principal.profundidadKm)} km de profundidad\n` +
    `💥 En ${lugar.nombre} se sintió *${describirIntensidad(mmi).etiqueta}*\n\n` +
    (replicas.length > 0 ? `Después vinieron ${replicas.length} réplica(s).\n\n` : "") +
    `La magnitud (M${principal.magnitud}) es del sismo; lo que sentiste depende de qué tan lejos y qué tan hondo fue.\n\n` +
    `Fuente: USGS\n${principal.url}`
  );
}

/**
 * Intenciones que atiende el workflow de Kapso, no este proceso.
 *
 * El reparto es: el workflow abre puertas (menús, botones, la ciudad) porque
 * corre en el momento; el responder contesta con datos porque puede consultar
 * la base. Que los dos contesten lo mismo es peor que si no contestara ninguno.
 */
const DEL_WORKFLOW = ["ayuda", "menu_ayudar", "menu_necesito"];

/**
 * Los botones que manda el workflow, por su título exacto.
 *
 * Tocarlos ya dispara la respuesta en Kapso —la lista de ciudades, el menú, la
 * despedida—, así que el responder no tiene nada que agregar. Sin esta lista,
 * tocar "Alertas de sismo" traía la lista de ciudades y encima el detalle del
 * último sismo, dos mensajes distintos para un solo toque.
 */
const BOTONES_WORKFLOW = [
  "alertas de sismo",
  "ayuda y donaciones",
  "ver el menu",
  "darme de baja",
];

export async function atenderPreguntas({ seco = false } = {}) {
  const suscriptores = await leerSuscriptores();
  const respondidos = await leerRespondidos();
  const mensajes = await entrantes(24);

  const nuevos = [];
  const contestados = new Set();
  let atendidos = 0;

  for (const m of mensajes) {
    if (respondidos.has(m.id)) continue;

    // Solo contestamos a quien ya está suscrito: los nuevos los atiende el
    // workflow de onboarding, y responder los dos sería hablar encima.
    //
    // Esta comprobación va antes de transcribir a propósito: transcribir
    // cuesta plata y no se le paga a ElevenLabs por un audio de alguien a
    // quien de todas formas no le vamos a contestar.
    const sus = suscriptores.find((s) => s.telefono === m.from);
    if (!sus) continue;

    const lugar = normalizarMunicipio(sus.municipio);
    if (!lugar) continue;

    // Después de un sismo la gente manda audios: manos ocupadas, a oscuras,
    // nerviosa. Se transcriben y siguen el mismo camino que el texto.
    const voz = m.type === "audio" ? await textoDeAudio(m) : null;
    const texto = textoDeMensaje(m) ?? voz?.texto;

    if (!texto) {
      // Si era una nota de voz y no se pudo entender, se dice. Callarse
      // deja a la persona creyendo que preguntó.
      if (m.type !== "audio") continue;
      if (seco) {
        console.log(`[seco] ${m.from} · audio ilegible → pedir texto`);
      } else {
        await enviarTexto(
          m.from,
          "No alcancé a escuchar tu nota de voz. Escríbeme la pregunta y te respondo."
        );
        respondidos.add(m.id);
        nuevos.push(m.id);
      }
      atendidos++;
      continue;
    }

    // El modelo solo entra donde las palabras clave no llegaron. Cuesta plata
    // y latencia: no se paga por clasificar "hola".
    let intencion = clasificarIntencion(texto);
    if (intencion === "desconocida") intencion = (await entender(texto)) ?? "desconocida";

    // La misma pregunta, una sola respuesta.
    //
    // La gente toca dos y tres veces cuando el bot tarda —más todavía después
    // de un sismo—, y contestarle tres veces lo mismo lo hace parecer roto.
    // Los repetidos se marcan como atendidos para que no vuelvan en la próxima
    // corrida.
    const yaContestado = `${m.from}:${intencion}`;
    if (contestados.has(yaContestado)) {
      respondidos.add(m.id);
      nuevos.push(m.id);
      continue;
    }
    contestados.add(yaContestado);

    // Lo que ya contestó el workflow no se contesta de nuevo.
    //
    // Los menús y la elección de ciudad los manda Kapso en el momento, con
    // botones. Si el responder los repite, la persona recibe el mismo menú dos
    // veces y el bot parece roto. Se marcan como atendidos para que no se
    // acumulen.
    if (
      DEL_WORKFLOW.includes(intencion) ||
      BOTONES_WORKFLOW.includes(sinAcentos(texto).trim()) ||
      normalizarMunicipio(texto)
    ) {
      respondidos.add(m.id);
      nuevos.push(m.id);
      continue;
    }

    // Cuando vino hablado se repite lo que se entendió: la transcripción se
    // equivoca y la persona tiene que poder darse cuenta.
    const respuesta =
      (voz ? `Entendí: "${voz.texto}"\n\n` : "") +
      (await componerRespuesta(intencion, lugar, texto));

    // Los menús salen como lista tocable; el texto queda de respaldo para el
    // registro en seco y para cuando WhatsApp rechace el interactivo.
    const cuerpo = recortar(respuesta);
    const conMenu = ["ayuda", "menu_ayudar", "menu_necesito"].includes(intencion);

    if (seco) {
      console.log(`[seco] ${m.from} · ${voz ? "🎙 " : ""}"${texto}" → ${intencion}${conMenu ? " (lista)" : ""}`);
      console.log(recortar(respuesta).replace(/^/gm, "    "), "\n");
    } else {
      const enlace = conMenu ? null : primerEnlace(cuerpo);
      const wamid = conMenu
        ? await enviarLista(m.from, menuLista(intencion))
        : enlace
          ? await enviarEnlace(m.from, { texto: cuerpo, ...enlace })
          : await enviarTexto(m.from, cuerpo);
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
  const seco = process.argv.includes("--seco");

  await atenderPreguntas({ seco });
}
