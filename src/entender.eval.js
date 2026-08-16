// Evaluación del clasificador contra mensajes reales: cuánto acierta y, sobre
// todo, en qué se equivoca.
//
//   node src/entender.eval.js              → todo el corpus
//   node src/entender.eval.js sangre       → solo los casos de esa etiqueta
//   node src/entender.eval.js --verboso    → también los aciertos
//
// Esto NO es `entender.test.js`. Aquel es el chequeo barato que corre en cada
// commit y no toca la red. Éste gasta plata y tarda, y se corre a mano cuando
// se cambia el prompt, el modelo o las categorías.
//
// Por qué existe: el clasificador no falla de una sola forma, y las dos formas
// no valen lo mismo.
//
//   PERDIDA   — la persona pidió ayuda y el bot no la reconoció. Le contesta
//               el detalle del último sismo. Es el peor resultado: alguien
//               buscando a su hermano recibe la magnitud de un temblor.
//
//   CONFUSION — la reconoció pero la mandó a la categoría equivocada. Malo,
//               pero recuperable: la persona lee, ve que no es, y repregunta.
//
//   RUIDO     — clasificó como ayuda algo que no lo era. Cuesta poco.
//
// Se optimiza contra PERDIDA primero. Un clasificador que se arriesga y se
// equivoca de categoría sirve más que uno prudente que se calla.

import { clasificarIntencion } from "./responder.js";
import { entender } from "./entender.js";

/**
 * Cómo escribe la gente de verdad después de un sismo: sin acentos, con
 * diminutivos, con la pregunta enterrada en una frase larga, con el asunto
 * implícito. Ninguno de estos casos lo resuelven las palabras clave —para eso
 * está responder.test.js, que ya cubre 51 frases directas.
 *
 * "desconocida" como esperado significa: acá NO hay una pregunta de ayuda, y
 * lo correcto es no inventarse una.
 */
const CORPUS = [
  // --- Acopio. La confusión cara es con `donar` (plata) y `sangre`.
  ["junte ropa usada y unos pañales de mi hija, no se si le sirve a alguien", "acopio"],
  ["tengo cuatro bultos de arroz en la finca, alguien los recoge?", "acopio"],
  ["mi conjunto hizo una recolecta, donde la dejamos", "acopio"],
  ["sirve ropa de invierno o eso alla no lo usan", "acopio"],
  ["tengo unas cobijas y colchonetas guardadas", "acopio"],

  // --- Donar plata. Que no se lo lleve `acopio` ni `necesito_dinero`.
  ["prefiero mandar plata que cosas, a donde", "donar"],
  ["me pueden pasar los datos para hacer una transferencia", "donar"],
  ["quiero aportar desde españa, se puede?", "donar"],

  // --- Sangre.
  ["soy o negativo, sirvo para algo?", "sangre"],
  ["donde estan haciendo las jornadas esas de donacion", "sangre"],

  // --- Voluntariado. Ojo con que caiga en menu_ayudar.
  ["mi mama es enfermera jubilada y quiere ponerse a la orden", "voluntariado"],
  // Falla conocida: cae en menu_ayudar. Duele porque el cierre de
  // `voluntariado` es justo para él —"si eres ingeniero o estudiante de esas
  // áreas, dilo al registrarte"— y el menú no se lo dice. Se deja acá a la
  // vista en vez de borrarlo: es la próxima mejora, no un caso perdido.
  ["soy estudiante de ingenieria civil, en que me necesitan", "voluntariado"],
  ["tengo camioneta y tiempo libre esta semana", "voluntariado"],

  // --- Alojamiento, los dos lados. Confundirlos es grave: manda a un
  // damnificado a ofrecer techo y a quien ofrece techo a pedirlo.
  ["tengo un apartaestudio vacio por si alguien lo necesita estos dias", "alojamiento_ofrecer"],
  ["puedo recibir a una familia en mi casa, somos pocos", "alojamiento_ofrecer"],
  ["nos sacaron del edificio y no tenemos para donde coger", "alojamiento_necesito"],
  ["llevamos dos noches en el carro con los niños", "alojamiento_necesito"],
  ["hay algun refugio abierto por aca?", "alojamiento_necesito"],

  // --- Buscar persona. Cero tolerancia a PERDIDA acá.
  ["mi hermano trabajaba en ese edificio y no contesta desde ayer", "buscar_persona"],
  ["alguien sabe algo de la gente que estaba en el centro comercial", "buscar_persona"],
  ["no hemos podido comunicarnos con mi abuela, vive sola", "buscar_persona"],

  // --- Mascota.
  ["se me perdio la michi con el susto", "mascota"],
  ["encontre un perrito asustado en la calle, que hago", "mascota"],

  // --- Necesito dinero. Se confunde con `donar` al revés.
  ["lo perdimos todo y no tengo ni para el mercado", "necesito_dinero"],
  // Dice dos necesidades a la vez. Va a alojamiento por la regla 2 del prompt:
  // dónde dormir esta noche pesa más que la plata de la semana entrante.
  ["como hago para que me ayuden, quede sin trabajo y sin casa", "alojamiento_necesito"],

  // --- Reportar daño.
  ["el edificio de mi tia quedo con unas rajaduras feas en la pared", "reportar_dano"],
  ["se cayo un pedazo del techo de la cocina, a quien le aviso", "reportar_dano"],
  ["la columna del parqueadero quedo torcida, es peligroso?", "reportar_dano"],

  // --- Sismo. Preguntas sobre el evento, no sobre ayuda.
  ["ese ruido raro antes del temblor que era", "detalle"],
  ["por que aca se sintio mas duro que en cali", "detalle"],
  ["esta noche va a volver a moverse?", "replicas"],
  ["cada rato siento como que se mueve, son imaginaciones mias?", "replicas"],

  // --- Los dos menús: quiere participar pero no dice cómo.
  ["quiero servir en lo que sea", "menu_ayudar"],
  ["en que estan necesitando manos", "menu_ayudar"],
  ["estamos mal, que opciones hay", "menu_necesito"],

  // --- Nada. Acá el acierto es NO inventarse una categoría.
  ["que hubo mi llave todo bien por alla", "desconocida"],
  ["gracias por el aviso, muy util", "desconocida"],
  ["👍", "desconocida"],
  ["REENVIADO: cadena de oracion por colombia 🙏 reenvia a 10 contactos", "desconocida"],
];

/** Las etiquetas donde una PERDIDA cuesta una vida, no una repregunta. */
const CRITICAS = new Set(["buscar_persona", "alojamiento_necesito", "reportar_dano"]);

/** Un caso: por dónde salió y qué tan mal salió. */
async function evaluar([mensaje, esperado]) {
  const porPalabras = clasificarIntencion(mensaje);
  const ruta = porPalabras === "desconocida" ? "modelo" : "palabras";
  const obtenido = ruta === "modelo" ? ((await entender(mensaje)) ?? "desconocida") : porPalabras;

  let falla = null;
  if (obtenido !== esperado) {
    if (esperado === "desconocida") falla = "RUIDO";
    else if (obtenido === "desconocida") falla = "PERDIDA";
    else falla = "CONFUSION";
  }

  return { mensaje, esperado, obtenido, ruta, falla, critica: CRITICAS.has(esperado) };
}

/**
 * ponytail: seis a la vez. Suficiente para que 40 casos tarden segundos, y
 * por debajo del límite de peticiones por minuto de cualquier plan.
 */
async function enTanda(items, n, fn) {
  const salida = [];
  for (let i = 0; i < items.length; i += n) {
    salida.push(...(await Promise.all(items.slice(i, i + n).map(fn))));
  }
  return salida;
}

const args = process.argv.slice(2);
const verboso = args.includes("--verboso");
const filtro = args.find((a) => !a.startsWith("--"));
const casos = filtro ? CORPUS.filter(([, e]) => e === filtro) : CORPUS;

if (!process.env.OPENROUTER_API_KEY) {
  console.error("Falta OPENROUTER_API_KEY: sin ella todo cae en 'desconocida' y la medición no dice nada.");
  process.exit(1);
}
if (casos.length === 0) {
  console.error(`Ningún caso con la etiqueta "${filtro}".`);
  process.exit(1);
}

console.log(`Evaluando ${casos.length} mensajes con ${process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini"}…\n`);

const resultados = await enTanda(casos, 6, evaluar);

const SIMBOLO = { PERDIDA: "✗ PERDIDA ", CONFUSION: "~ CONFUSION", RUIDO: "· RUIDO   " };

for (const r of resultados) {
  if (!r.falla && !verboso) continue;
  const marca = r.falla ? SIMBOLO[r.falla] : "✓ ok      ";
  const critica = r.falla && r.critica ? " 🔴" : "";
  console.log(`${marca}${critica}  ${r.esperado} → ${r.obtenido}  [${r.ruta}]`);
  console.log(`            « ${r.mensaje} »\n`);
}

const cuenta = (f) => resultados.filter((r) => r.falla === f).length;
const aciertos = resultados.filter((r) => !r.falla).length;
const perdidasCriticas = resultados.filter((r) => r.falla === "PERDIDA" && r.critica).length;
const porModelo = resultados.filter((r) => r.ruta === "modelo");
const aciertosModelo = porModelo.filter((r) => !r.falla).length;

console.log("─".repeat(60));
console.log(`Aciertos       ${aciertos}/${resultados.length}  (${Math.round((aciertos / resultados.length) * 100)}%)`);
console.log(`  vía modelo   ${aciertosModelo}/${porModelo.length}`);
console.log(`PERDIDA        ${cuenta("PERDIDA")}   ← pidió ayuda y no la reconoció`);
console.log(`CONFUSION      ${cuenta("CONFUSION")}   ← la mandó a la categoría equivocada`);
console.log(`RUIDO          ${cuenta("RUIDO")}   ← inventó una necesidad que no había`);

if (perdidasCriticas > 0) {
  console.log(`\n🔴 ${perdidasCriticas} pérdida(s) en categoría crítica. Eso no se despliega.`);
  process.exit(1);
}
console.log("\nSin pérdidas críticas.");
