import { START, Workflow } from "@kapso/workflows";

// Número de WhatsApp "Melo" (+1 555-307-5027)
const PHONE_NUMBER_ID = "1243233552205505";

// El modelo que resuelve las bifurcaciones. Barato porque las decisiones son
// de dos opciones y con el texto del mensaje alcanza.
const MODELO_DECISION = "gpt-4.1-mini";

const workflow = new Workflow("onboarding", {
  name: "Onboarding, suscripción y menú de ayuda",
});

// Se dispara con cualquier mensaje entrante. Que el usuario escriba primero
// no es un detalle de UX: es la única forma de abrir la ventana de 24h de
// WhatsApp. Sin mensaje entrante, Meta bloquea todo lo que salga (error 131049).
//
// Un solo workflow por número, a propósito. Kapso dispara TODOS los workflows
// activos con este trigger: tener "onboarding" y "ayuda" por separado hacía
// que cada mensaje arrancara los dos y la conversación quedara pegada. El
// trigger tampoco filtra por palabra (`matches` no existe en el SDK), así que
// quién entra por dónde lo decide el nodo `decidir_entrada`.
workflow.addTrigger({
  type: "inbound_message",
  phoneNumberId: PHONE_NUMBER_ID,
});

workflow.addNode(START, { position: { x: 100, y: 100 } });

// Primera bifurcación: ¿esto es alguien nuevo o alguien que ya está suscrito
// y viene a pedir algo?
//
// Sin este nodo, el suscrito que escribe "ayuda" recibe otra vez la lista de
// ciudades y nunca llega al menú: exactamente el flujo pegado que había.
//
// ponytail: decisión por IA porque es la única bifurcación que Kapso ofrece
// sin desplegar una función. El techo: cuesta una llamada al modelo por
// mensaje y puede equivocarse. Se cambia por `decisionType: "function"` con
// una función que lea el id del botón y consulte si el número ya está
// suscrito, que es determinista y gratis.
workflow.addNode("decidir_entrada", {
  type: "decide",
  decisionType: "ai",
  // Kapso rechaza el nodo sin modelo (invalid_attributes: providerModel blank).
  providerModel: MODELO_DECISION,
  conditions: [
    {
      label: "fila",
      description:
        "Tocó una fila del menú: 'Llevar cosas', 'Donar dinero', 'Donar sangre', " +
        "'Ser voluntario', 'Ofrecer alojamiento', 'Buscar a alguien', 'Perdí mi mascota', " +
        "'Necesito dónde dormir', 'Necesito ayuda económica' o 'Reportar daños'. " +
        "También si pregunta por un sismo: qué tan fuerte fue, réplicas, cambiar de ciudad.",
    },
    {
      label: "menu",
      description:
        "Pide ver las opciones: ayuda, el menú, qué puede hacer, o tocó el botón " +
        "'Ver el menú'.",
    },
    {
      label: "puerta",
      description:
        "No pide nada concreto: un saludo, un 'hola', un mensaje suelto, o cualquier cosa " +
        "que no se entienda.",
    },
  ],
  position: { x: 100, y: 220 },
});

// La puerta: dos botones en vez de adivinar si ya está suscrito.
//
// Kapso no le da al workflow forma de saber si este número ya se suscribió —el
// nodo de espera guarda texto plano y nada más—, así que la IA lo adivinaba, y
// se equivocaba: a alguien ya suscrito que escribía "Hola" le volvía a pedir
// la ciudad. Preguntarlo cuesta un toque; adivinarlo mal cuesta la
// conversación entera.
//
// ponytail: el toque de más desaparece el día que haya una función Kapso que
// consulte los suscriptores; ahí esta puerta se salta para quien ya está.
workflow.addNode("puerta_inicial", {
  type: "send_interactive",
  interactiveType: "button",
  bodyText:
    "Te aviso cuando tiemble donde estás, y qué tan fuerte se sintió ahí.\n\n" +
    "El aviso llega después del temblor, no antes.\n\n" +
    "¿Con qué te ayudo?",
  footerText: "Puedes volver acá escribiendo AYUDA",
  buttons: [
    { id: "alertas", title: "Alertas de sismo" },
    { id: "ayuda", title: "Ayuda y donaciones" },
  ],
  position: { x: 100, y: 220 },
});

workflow.addNode("esperar_puerta", {
  type: "wait_for_response",
  saveResponseTo: "puerta",
  position: { x: 100, y: 280 },
});

workflow.addNode("decidir_puerta", {
  type: "decide",
  decisionType: "ai",
  providerModel: MODELO_DECISION,
  conditions: [
    { label: "alertas", description: "Tocó 'Alertas de sismo' o dijo que quiere recibir avisos de temblores." },
    { label: "ayuda", description: "Tocó 'Ayuda y donaciones', o dice que necesita algo o que quiere ayudar." },
  ],
  position: { x: 100, y: 300 },
});

// Saludo y pregunta en un solo mensaje, no en dos.
//
// El primer mensaje es donde más gente se cae: cada burbuja que la persona
// tiene que leer antes de poder hacer algo es una oportunidad de cerrar el
// chat. Acá se presenta, dice para qué sirve, avisa que no es alerta
// temprana y pide la ciudad — todo en una pantalla y a un toque de responder.
//
// La lista, además de ser más rápida que escribir, hace imposible el error:
// quien escribe "Springfield" queda suscrito a la nada, nunca recibe una
// alerta y nunca sabe por qué.
//
// ponytail: 10 ciudades fijas. El techo es evidente —Colombia tiene 1.100
// municipios— y se sube pidiendo la ubicación por GPS en vez de una lista.
workflow.addNode("pedir_ciudad", {
  type: "send_interactive",
  interactiveType: "list",
  headerType: "text",
  headerText: "Centinela",
  bodyText:
    "Te aviso cuando tiemble donde estás, y qué tan fuerte se sintió ahí.\n\n" +
    "El aviso llega después del temblor, no antes.\n\n" +
    "¿En qué ciudad estás?",
  footerText: "Escribe AYUDA si necesitas o quieres dar una mano",
  listButtonText: "Elegir ciudad",
  listSections: [
    // WhatsApp permite 10 filas en total, no por sección. Elegidas por
    // sismicidad real: el nido de Bucaramanga y el eje cafetero concentran
    // la mayoría de los eventos sentidos del país.
    {
      title: "Zona sísmica alta",
      rows: [
        { id: "quibdo", title: "Quibdó", description: "Chocó" },
        { id: "pereira", title: "Pereira", description: "Risaralda" },
        { id: "manizales", title: "Manizales", description: "Caldas" },
        { id: "armenia", title: "Armenia", description: "Quindío" },
        { id: "bucaramanga", title: "Bucaramanga", description: "Santander" },
        { id: "cali", title: "Cali", description: "Valle del Cauca" },
        { id: "pasto", title: "Pasto", description: "Nariño" },
        { id: "tumaco", title: "Tumaco", description: "Nariño · riesgo de tsunami" },
      ],
    },
    {
      title: "Otras ciudades",
      rows: [
        { id: "medellin", title: "Medellín", description: "Antioquia" },
        { id: "bogota", title: "Bogotá", description: "Cundinamarca" },
      ],
    },
  ],
  position: { x: 100, y: 340 },
});

workflow.addNode("recibir_ciudad", {
  type: "wait_for_response",
  saveResponseTo: "ciudad",
  position: { x: 100, y: 460 },
});

// ¿Contestó con una ciudad o con cualquier otra cosa?
//
// Sin esto el bot llegó a mandar "Quedaste suscrito para Hola": el nodo de
// espera guarda lo que llegue, sea lo que sea. Confirmar una suscripción que
// no existe es la peor mentira que puede decir este bot.
workflow.addNode("ciudad_valida", {
  type: "decide",
  decisionType: "ai",
  providerModel: MODELO_DECISION,
  conditions: [
    {
      label: "ciudad",
      description:
        "Contestó con una de las ciudades de la lista: Quibdó, Pereira, Manizales, Armenia, " +
        "Bucaramanga, Cali, Pasto, Tumaco, Medellín o Bogotá.",
    },
    {
      label: "otra_cosa",
      description: "Contestó cualquier otra cosa: un saludo, una pregunta, o una ciudad que no está en la lista.",
    },
  ],
  position: { x: 100, y: 520 },
});

// Los botones dicen lo mismo que la línea "AYUDA · BAJA", pero a un toque.
// Los títulos están escritos para que `clasificarIntencion` los reconozca
// como texto ("menú" → ayuda, "baja" → baja): WhatsApp manda el título como
// si la persona lo hubiera escrito, así que no hay que tocar el responder.
//
// El id cambió de "confirmar" a "confirmar_botones" a propósito: Kapso
// rechaza (server_error) el push que le cambia el tipo a un nodo que ya
// existe. Cambiar el tipo de un nodo publicado = id nuevo.
workflow.addNode("confirmar_botones", {
  type: "send_interactive",
  interactiveType: "button",
  // Sin `{{vars.ciudad}}`: el nodo de espera guarda el texto crudo que arma
  // WhatsApp, así que el mensaje salía como "suscrito para Selected: Armenia".
  // La ciudad la nombra cada alerta, que es donde de verdad importa.
  bodyText:
    "Listo ✅ Quedaste suscrito a la ciudad que elegiste.\n\n" +
    "Solo te escribo cuando tiemble lo suficiente para sentirse ahí.",
  buttons: [
    { id: "ayuda", title: "Ver el menú" },
    { id: "baja", title: "Darme de baja" },
  ],
  position: { x: 100, y: 580 },
});

workflow.addNode("esperar_boton", {
  type: "wait_for_response",
  saveResponseTo: "eleccion",
  position: { x: 100, y: 700 },
});

workflow.addNode("decidir_boton", {
  type: "decide",
  decisionType: "ai",
  // Kapso rechaza el nodo sin modelo (invalid_attributes: providerModel blank).
  providerModel: MODELO_DECISION,
  conditions: [
    { label: "baja", description: "Quiere dejar de recibir alertas: tocó 'Darme de baja' o escribió baja, stop, cancelar." },
    { label: "menu", description: "Cualquier otra cosa: quiere el menú, pregunta algo, o saluda." },
  ],
  position: { x: 100, y: 820 },
});

// Las dos puertas en una sola lista, no en dos pasos.
//
// Quien viene a dar y quien viene a pedir están en momentos opuestos, y por eso
// van en secciones separadas — pero separarlos en dos mensajes le cobraba al
// damnificado un toque extra y una espera. Las secciones ya hacen ese trabajo.
// "Necesito ayuda" va primero: al que la está pasando mal no se le hace
// scrollear entre opciones de donación.
//
// Los títulos de las filas son exactamente las frases que reconoce
// `clasificarIntencion` en src/responder.js. Cuando alguien toca una fila,
// WhatsApp manda su título como si lo hubiera escrito, así que el bot lo
// atiende por el mismo camino que el texto libre. El workflow solo abre la
// puerta; la respuesta la compone el responder, que sí puede consultar los
// acopios cercanos.
//
// ponytail: WhatsApp permite 10 filas en total y las dos puertas suman
// exactamente 10. La próxima opción obliga a volver al menú de dos pasos.
workflow.addNode("menu_completo", {
  type: "send_interactive",
  interactiveType: "list",
  headerType: "text",
  headerText: "¿Con qué te ayudo?",
  bodyText:
    "Elige una y te digo a dónde ir, lo más cerca que tenga de donde estás.\n\n" +
    "Después puedes pedirme otra.",
  footerText: "Todo lo que te paso lleva fuente y fecha",
  listButtonText: "Ver opciones",
  listSections: [
    {
      title: "Necesito ayuda",
      rows: [
        { id: "buscar_persona", title: "Buscar a alguien", description: "Reportar o consultar" },
        { id: "mascota", title: "Perdí mi mascota", description: "Reportar o buscar" },
        { id: "alojamiento_necesito", title: "Necesito dónde dormir", description: "Alojamiento temporal" },
        { id: "necesito_dinero", title: "Necesito ayuda económica", description: "Publicar mi caso" },
        { id: "reportar_dano", title: "Reportar daños", description: "Mi casa o edificio" },
      ],
    },
    {
      title: "Quiero ayudar",
      rows: [
        { id: "acopio", title: "Llevar cosas", description: "Mercado, ropa, aseo" },
        { id: "donar", title: "Donar dinero", description: "Canales verificados" },
        { id: "sangre", title: "Donar sangre", description: "Puntos y jornadas" },
        { id: "voluntariado", title: "Ser voluntario", description: "Poner el tiempo o el oficio" },
        { id: "alojamiento_ofrecer", title: "Ofrecer alojamiento", description: "Tengo un espacio libre" },
      ],
    },
  ],
  position: { x: 300, y: 940 },
});

// La baja la ejecuta src/suscribir.js, que lee los mensajes entrantes y borra
// al que escribió "baja". Este mensaje solo cierra la conversación; prometer
// menos que eso sería mentir, y prometer más también.
workflow.addNode("despedida", {
  type: "send_text",
  message:
    "Listo, no te escribo más.\n\n" +
    "Si cambias de idea, mándame cualquier mensaje y te vuelvo a dar de alta.",
  position: { x: -100, y: 940 },
});

// El final callado: la fila la contesta src/responder.js, con datos.
//
// Antes acá había un `wait_for_response` para que el toque no rearrancara el
// flujo. Se tragaba el mensaje siguiente —"Hola" incluido— y la conversación
// quedaba muerta sin que el bot dijera nada. Ahora cada mensaje arranca una
// corrida nueva y es `decidir_entrada` el que manda las filas a este final
// mudo, así que un "Hola" siempre vuelve a abrir la puerta.
workflow.addNode("fin_fila", {
  type: "set_variable",
  variableName: "atendido_por_responder",
  variableValue: true,
  valueType: "boolean",
  position: { x: 520, y: 1060 },
});

workflow.addEdge(START, "decidir_entrada");
workflow.addEdge("decidir_entrada", "puerta_inicial", { label: "puerta" });
workflow.addEdge("decidir_entrada", "menu_completo", { label: "menu" });
workflow.addEdge("puerta_inicial", "esperar_puerta");
workflow.addEdge("esperar_puerta", "decidir_puerta");
workflow.addEdge("decidir_puerta", "pedir_ciudad", { label: "alertas" });
workflow.addEdge("decidir_puerta", "menu_completo", { label: "ayuda" });
workflow.addEdge("pedir_ciudad", "recibir_ciudad");
workflow.addEdge("recibir_ciudad", "ciudad_valida");
workflow.addEdge("ciudad_valida", "confirmar_botones", { label: "ciudad" });
// Sin ciudad no hay suscripción: se le muestra la lista otra vez en vez de
// confirmarle algo que no pasó.
workflow.addEdge("ciudad_valida", "pedir_ciudad", { label: "otra_cosa" });
workflow.addEdge("confirmar_botones", "esperar_boton");
workflow.addEdge("esperar_boton", "decidir_boton");
workflow.addEdge("decidir_boton", "menu_completo", { label: "menu" });
workflow.addEdge("decidir_boton", "despedida", { label: "baja" });
workflow.addEdge("decidir_entrada", "fin_fila", { label: "fila" });

export default workflow;
