import { START, Workflow } from "@kapso/workflows";

// Número de WhatsApp "Melo" (+1 555-307-5027)
const PHONE_NUMBER_ID = "1243233552205505";

const workflow = new Workflow("onboarding", {
  name: "Onboarding y suscripción a alertas",
});

// Se dispara con cualquier mensaje entrante. Que el usuario escriba primero
// no es un detalle de UX: es la única forma de abrir la ventana de 24h de
// WhatsApp. Sin mensaje entrante, Meta bloquea todo lo que salga (error 131049).
workflow.addTrigger({
  type: "inbound_message",
  phoneNumberId: PHONE_NUMBER_ID,
});

workflow.addNode(START, { position: { x: 100, y: 100 } });

workflow.addNode("saludo", {
  type: "send_text",
  message:
    "Hola 👋 Soy Centinela.\n\n" +
    "Te aviso cuando tiemble donde estás, y te digo qué tan fuerte se sintió *ahí* — no la magnitud del epicentro, que sola no dice nada.\n\n" +
    "Antes de seguir, algo honesto: el aviso te llega *después* del temblor, no antes. Nadie puede avisarte antes con datos públicos. Sirve para saber qué pasó, cuánto te tocó, y avisarte de las réplicas.",
  position: { x: 100, y: 220 },
});

// Lista en vez de texto libre. Si la persona escribe "Springfield" y la
// dejamos suscribirse, nunca recibe una alerta y nunca sabe por qué: un
// fallo silencioso justo en el momento de ganar su confianza.
//
// ponytail: 12 ciudades fijas. El techo es evidente —Colombia tiene 1.100
// municipios— y se sube conectando el shapefile del DANE y pidiendo la
// ubicación por GPS en vez de elegirla de una lista.
workflow.addNode("pedir_ciudad", {
  type: "send_interactive",
  interactiveType: "list",
  headerType: "text",
  headerText: "¿Dónde estás?",
  bodyText: "Elegí tu ciudad para calcular qué tan fuerte se sentiría un sismo ahí.",
  footerText: "Podés cambiarla después escribiendo CAMBIAR",
  listButtonText: "Ver ciudades",
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

workflow.addNode("confirmar", {
  type: "send_text",
  message:
    "Listo, quedaste suscrito para {{vars.ciudad}} ✅\n\n" +
    "No te voy a escribir todos los días. Solo cuando tiemble lo suficiente para sentirse ahí — y si viene una réplica, te la agrupo en un solo mensaje en vez de despertarte cinco veces.\n\n" +
    "Escribime cuando quieras si querés entender algo. Escribí BAJA para dejar de recibirlas.",
  position: { x: 100, y: 580 },
});

workflow.addEdge(START, "saludo");
workflow.addEdge("saludo", "pedir_ciudad");
workflow.addEdge("pedir_ciudad", "recibir_ciudad");
workflow.addEdge("recibir_ciudad", "confirmar");

export default workflow;
