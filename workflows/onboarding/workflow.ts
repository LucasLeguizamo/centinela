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

workflow.addNode("confirmar", {
  type: "send_text",
  message:
    "Listo ✅ Quedaste suscrito para {{vars.ciudad}}.\n\n" +
    "Solo te escribo cuando tiemble lo suficiente para sentirse ahí.\n\n" +
    "AYUDA para el menú · BAJA para dejar de recibir",
  position: { x: 100, y: 580 },
});

workflow.addEdge(START, "pedir_ciudad");
workflow.addEdge("pedir_ciudad", "recibir_ciudad");
workflow.addEdge("recibir_ciudad", "confirmar");

export default workflow;
