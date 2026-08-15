import { START, Workflow } from "@kapso/workflows";

// Número de WhatsApp "Melo" (+1 555-307-5027)
const PHONE_NUMBER_ID = "1243233552205505";

const workflow = new Workflow("bienvenida", {
  name: "Bienvenida y suscripción a alertas",
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
  type: "send_interactive",
  interactiveType: "button",
  headerType: "text",
  headerText: "Centinela",
  bodyText:
    "Hola 👋 Soy Centinela. Vigilo lo público y te aviso cuando algo te afecta, sin que tengas que buscar nada.\n\n¿Sobre qué querés recibir alertas?",
  footerText: "Escribí BAJA cuando quieras dejar de recibirlas",
  buttons: [
    { id: "sismos", title: "Sismos" },
    { id: "contratos", title: "Contratos públicos" },
    { id: "ambas", title: "Las dos" },
  ],
});

workflow.addNode("elegir_tema", { type: "wait_for_response", saveResponseTo: "tema" });

workflow.addNode("pedir_ciudad", {
  type: "send_text",
  message:
    "Listo. ¿En qué municipio estás?\n\nLo uso para dos cosas: calcular qué tan fuerte se sentiría un sismo donde estás, y vigilar los contratos de tu alcaldía. Respondé solo el nombre, por ejemplo: Quibdó.",
});

workflow.addNode("recibir_ciudad", { type: "wait_for_response", saveResponseTo: "ciudad" });

workflow.addNode("confirmar", {
  type: "send_text",
  message:
    "Quedaste suscrito para {{vars.ciudad}} ✅\n\nNo te voy a escribir todos los días. Solo cuando pase algo que valga la pena: un sismo que se sienta ahí, una réplica, o un contrato de tu alcaldía con señales de riesgo.\n\nPodés responderme en cualquier momento si querés entender algo.",
});

workflow.addEdge(START, "saludo");
workflow.addEdge("saludo", "elegir_tema");
workflow.addEdge("elegir_tema", "pedir_ciudad");
workflow.addEdge("pedir_ciudad", "recibir_ciudad");
workflow.addEdge("recibir_ciudad", "confirmar");

export default workflow;
