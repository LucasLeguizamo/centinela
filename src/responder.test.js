// Autochequeo del clasificador de intenciones: node src/responder.test.js

import assert from "node:assert/strict";
import { clasificarIntencion, componerRespuesta, menuLista, textoDeMensaje, primerEnlace, recortar } from "./responder.js";
import { MUNICIPIOS } from "./sismos.js";

// Cómo escribe la gente de verdad: sin acentos, sin mayúsculas, con typos.
const CASOS = [
  ["¿qué tan fuerte fue?", "detalle"],
  ["que tan fuerte fue", "detalle"],
  ["QUE PASO", "detalle"],
  ["cuanto fue la magnitud", "detalle"],
  ["temblo otra vez?", "replicas"],
  ["hubo replicas", "replicas"],
  ["¿hubo réplicas?", "replicas"],
  ["quiero cambiar de ciudad", "cambiar"],
  ["me mude", "cambiar"],
  ["BAJA", "baja"],
  ["ya no quiero", "baja"],
  ["parar", "baja"],
  ["hola", "ayuda"],
  ["ayuda", "ayuda"],
  ["buenas", "ayuda"],

  // Títulos de los botones del mensaje de confirmación (workflows/onboarding):
  // WhatsApp los manda como texto, así que tienen que caer donde corresponde.
  ["Ver el menú", "ayuda"],
  ["Darme de baja", "baja"],

  // Las dos puertas del menú. Van antes que las categorías porque "necesito
  // ayuda" contiene "ayuda", que si no se la llevaría el menú general.
  ["quiero ayudar", "menu_ayudar"],
  ["Quiero ayudar", "menu_ayudar"],
  ["en que puedo ayudar", "menu_ayudar"],
  ["necesito ayuda", "menu_necesito"],
  ["Necesito ayuda", "menu_necesito"],

  // Recursos de ayuda. La frontera fina está entre las tres: "donar sangre"
  // no es "donar dinero", y "donar" a secas es llevar cosas a un acopio.
  ["donde dono", "acopio"],
  ["dónde llevo la ayuda", "acopio"],
  ["centros de acopio", "acopio"],
  ["que puedo donar", "acopio"],
  ["donde llevar mercado", "acopio"],
  ["donar sangre", "sangre"],
  ["banco de sangre cerca", "sangre"],
  ["quiero donar dinero", "donar"],
  ["a que cuenta transfiero plata", "donar"],
  ["tienen nequi", "donar"],

  // Categorías nuevas del menú.
  ["quiero ser voluntario", "voluntariado"],
  ["soy ingeniero civil", "voluntariado"],
  ["perdí mi perro", "mascota"],
  ["estoy buscando a mi hermano", "buscar_persona"],
  ["mi tía está desaparecida", "buscar_persona"],
  ["necesito donde dormir", "alojamiento_necesito"],
  ["tengo una habitacion libre", "alojamiento_ofrecer"],
  ["mi casa tiene grietas", "reportar_dano"],

  // Los títulos exactos de los botones: al tocar una fila, WhatsApp manda el
  // título como si la persona lo hubiera escrito. Si esto se rompe, los
  // botones dejan de funcionar sin que nadie se entere.
  ["Llevar cosas", "acopio"],
  ["Donar dinero", "donar"],
  ["Donar sangre", "sangre"],
  ["Ser voluntario", "voluntariado"],
  ["Ofrecer alojamiento", "alojamiento_ofrecer"],
  ["Buscar a alguien", "buscar_persona"],
  ["Perdí mi mascota", "mascota"],
  ["Necesito dónde dormir", "alojamiento_necesito"],
  ["Necesito ayuda económica", "necesito_dinero"],
  ["Reportar daños", "reportar_dano"],

  // Varias a la vez: obligar a preguntar de a una convierte una conversación
  // en un formulario.
  ["quiero donar sangre y llevar mercado", "varias"],
];

for (const [texto, esperado] of CASOS) {
  assert.equal(
    clasificarIntencion(texto),
    esperado,
    `"${texto}" debería ser ${esperado}, dio ${clasificarIntencion(texto)}`
  );
}

// "baja" gana sobre todo lo demás: si alguien quiere irse, se va. Un producto
// de notificaciones que discute la baja es spam.
assert.equal(clasificarIntencion("que tan fuerte fue? ya no quiero mas"), "baja");

// Las respuestas que no consultan la red deben salir completas y sin huecos.
for (const intencion of ["baja", "cambiar", "ayuda"]) {
  const r = await componerRespuesta(intencion, MUNICIPIOS.quibdo);
  assert.ok(r.length > 40, `respuesta de ${intencion} demasiado corta`);
  assert.ok(!r.includes("undefined"), `respuesta de ${intencion} con huecos`);
}

// La ayuda tiene que repetir la advertencia: es la promesa que no podemos
// dejar que el usuario malentienda.
const ayuda = await componerRespuesta("ayuda", MUNICIPIOS.quibdo);
assert.ok(/despu[eé]s del temblor, no antes/.test(ayuda), "la ayuda debe aclarar que no es alerta temprana");

// El menú tiene que anunciar las dos puertas: una capacidad que no se nombra
// no existe para quien está del otro lado.
for (const palabra of ["QUIERO AYUDAR", "NECESITO AYUDA"]) {
  assert.ok(ayuda.includes(palabra), `el menú debería mencionar "${palabra}"`);
}

// Las dos puertas y sus categorías.
for (const puerta of ["menu_ayudar", "menu_necesito"]) {
  const r = await componerRespuesta(puerta, MUNICIPIOS.quibdo);
  assert.ok(r.length > 80, `el menú ${puerta} salió demasiado corto`);
  assert.ok(!r.includes("undefined"), `el menú ${puerta} tiene huecos`);
}

// Cada categoría del menú tiene que responder algo útil y con enlace, tanto
// si hay lugares físicos cerca como si no. Un botón que lleva a un mensaje
// vacío es peor que no tener el botón.
const CATEGORIAS_MENU = [
  "acopio", "donar", "sangre", "voluntariado", "alojamiento_ofrecer",
  "buscar_persona", "mascota", "alojamiento_necesito", "necesito_dinero", "reportar_dano",
];
for (const categoria of CATEGORIAS_MENU) {
  const r = await componerRespuesta(categoria, MUNICIPIOS.quibdo);
  assert.ok(r.length > 60, `${categoria} respondió demasiado corto`);
  assert.ok(!r.includes("undefined"), `${categoria} tiene huecos`);
  assert.ok(/https?:\/\//.test(r), `${categoria} debe citar una fuente consultable`);
}

// Segmentación por ubicación. Techo Cafetero solo cubre el Eje Cafetero:
// a alguien de Pereira se le recomienda a secas; a alguien de Quibdó se le
// nombra pero advirtiendo hasta dónde llega. Callárselo lo dejaría creyendo
// que su ofrecimiento no le sirve a nadie.
const techoPereira = await componerRespuesta("alojamiento_ofrecer", MUNICIPIOS.pereira);
const techoQuibdo = await componerRespuesta("alojamiento_ofrecer", MUNICIPIOS.quibdo);

assert.ok(techoPereira.includes("techocafetero"), "Pereira está en la cobertura");
assert.ok(
  !techoPereira.includes("solo cubre"),
  "a quien sí cubre no se le pone la advertencia de cobertura"
);
assert.ok(
  techoQuibdo.includes("solo cubre Pereira y Armenia"),
  "a quien queda fuera hay que decirle hasta dónde llega"
);

// Varias categorías en un mismo mensaje se responden todas.
const varias = await componerRespuesta(
  "varias", MUNICIPIOS.quibdo, "quiero donar sangre y llevar mercado"
);
assert.ok(varias.includes("———"), "las respuestas múltiples van separadas");
assert.ok(varias.length > 200, "una respuesta múltiple no puede ser más corta que una simple");

// Sin recursos cargados, las tres intenciones nuevas responden igual de bien:
// dicen que no tienen el dato y mandan a la fuente. Nunca inventan un lugar.
for (const intencion of ["acopio", "sangre", "donar"]) {
  const r = await componerRespuesta(intencion, MUNICIPIOS.quibdo);
  assert.ok(r.length > 60, `respuesta de ${intencion} demasiado corta`);
  assert.ok(!r.includes("undefined"), `respuesta de ${intencion} con huecos`);
  assert.ok(/https?:\/\//.test(r), `${intencion} debe citar una fuente consultable`);
}

// Regla dura del producto: el bot no dicta números de cuenta.
//
// Con campañas falsas activas suplantando entidades, un bot que recita una
// cuenta es el vector perfecto. Esta prueba existe para que nadie la agregue
// "por comodidad" en un commit apurado a las 3 de la mañana.
const donar = await componerRespuesta("donar", MUNICIPIOS.quibdo);
assert.ok(
  !/\d[\d\s.-]{7,}/.test(donar.replace(/https?:\/\/\S+/g, "")),
  "la respuesta de donación no puede contener algo con forma de número de cuenta"
);
assert.ok(
  /oficial/.test(donar),
  "la respuesta de donación debe mandar al canal oficial de cada organización"
);

// Los menús tocables: WhatsApp corta la lista en 10 filas sin avisar, y una
// fila cortada es una puerta que la persona nunca ve.
for (const intencion of ["ayuda", "menu_ayudar", "menu_necesito"]) {
  const lista = menuLista(intencion);
  const filas = lista.secciones.flatMap((s) => s.filas);

  assert.ok(filas.length <= 10, `${intencion}: ${filas.length} filas, WhatsApp acepta 10`);
  assert.ok(filas.length > 0, `${intencion} sin opciones`);
  assert.ok(lista.botonLista.length <= 20, "el botón de la lista se corta en 20 caracteres");

  for (const fila of filas) {
    assert.ok(fila.titulo.length <= 24, `fila larga: ${fila.titulo}`);
    // Tocar la fila manda su título como texto: si el clasificador no lo
    // reconoce, el bot no sabe qué le pidieron.
    assert.notEqual(clasificarIntencion(fila.titulo), "desconocida", `fila muda: ${fila.titulo}`);
  }
}

// Quien pide ayuda a secas ve las dos puertas, y la de quien la está pasando
// mal va primero.
assert.equal(menuLista("ayuda").secciones.length, 2);
assert.match(menuLista("ayuda").secciones[0].titulo, /necesitas/i);

// Un toque no trae text.body: si esto se rompe, el bot ignora en silencio
// todos los botones que él mismo mandó.
assert.equal(
  textoDeMensaje({ interactive: { type: "list_reply", list_reply: { id: "buscar_persona", title: "Buscar a alguien" } } }),
  "Buscar a alguien"
);
assert.equal(
  textoDeMensaje({ interactive: { type: "button_reply", button_reply: { id: "ayuda", title: "Ver el menú" } } }),
  "Ver el menú"
);
assert.equal(textoDeMensaje({ text: { body: "hola" } }), "hola");
assert.equal(textoDeMensaje({ type: "audio" }), null);

// El botón de enlace: WhatsApp deja uno solo por mensaje y corta la etiqueta
// en 20 caracteres. Se lo lleva el primer recurso, que es el más relevante.
const conRecurso = await componerRespuesta("necesito_dinero", MUNICIPIOS.quibdo);
const enlace = primerEnlace(conRecurso);
assert.ok(enlace, "una respuesta con recursos debe poder llevar botón");
assert.ok(enlace.url.startsWith("http"));
assert.ok(enlace.etiqueta.length <= 20, `etiqueta larga: ${enlace.etiqueta}`);

// Sin enlaces no hay botón que poner, y un cuerpo largo no entra en un
// mensaje interactivo: en los dos casos sale como texto.
assert.equal(primerEnlace("No tengo nada cerca todavía."), null);
assert.equal(primerEnlace("x".repeat(1100) + " https://ejemplo.org"), null);

// Ninguna respuesta puede salir cortada a mitad de una dirección o un enlace:
// mandar a alguien a un lugar a medias es peor que no mandarlo.
const largo = await componerRespuesta("donar", MUNICIPIOS.quibdo);
const corto = recortar(largo);
assert.ok(largo.length > 1024, "esta prueba necesita una respuesta que se pase del tope");
assert.ok(corto.length <= 1024, `el recorte dejó ${corto.length} caracteres`);
assert.ok(corto.includes("oficial"), "la frase que abre se queda");
assert.ok(corto.includes("No te fíes"), "la advertencia de campañas falsas no se recorta nunca");
assert.ok(corto.includes("nunca te voy a mandar un número de cuenta"), "la promesa de no dictar cuentas tampoco");
assert.ok(!/https?:\/\/\S*$/.test(corto) || corto.endsWith(")"), "no se corta un enlace por la mitad");
for (const url of corto.match(/https?:\/\/\S+/g) ?? []) {
  assert.ok(largo.includes(url), "todo enlace que queda tiene que ser uno completo del original");
}

// Lo que ya entra no se toca.
assert.equal(recortar("una respuesta corta"), "una respuesta corta");

// Los botones del workflow los contesta Kapso. Si el clasificador empieza a
// darles una intención propia, la persona recibe dos respuestas por un toque.
for (const titulo of ["Alertas de sismo", "Ayuda y donaciones", "Ver el menú", "Darme de baja"]) {
  assert.ok(
    ["ayuda", "baja", "desconocida", "detalle"].includes(clasificarIntencion(titulo)),
    `"${titulo}" es un botón del workflow: el responder no debería tener respuesta propia`
  );
}

console.log(`✓ responder.js ok — ${CASOS.length} frases clasificadas`);
