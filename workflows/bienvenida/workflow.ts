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

// Una sola pregunta. El municipio es el único dato que el sistema necesita
// para calcular qué tan fuerte se sentiría un sismo donde está la persona.
workflow.addNode("saludo", {
  type: "send_text",
  message:
    "Hola 👋 Soy Centinela.\n\n" +
    "Te aviso cuando tiemble donde estás, con qué tan fuerte se sintió ahí — no la magnitud del epicentro, que no dice nada.\n\n" +
    "¿En qué municipio estás? Respondé solo el nombre, por ejemplo: Quibdó.",
});

workflow.addNode("recibir_ciudad", { type: "wait_for_response", saveResponseTo: "ciudad" });

workflow.addNode("confirmar", {
  type: "send_text",
  message:
    "Listo, quedaste suscrito para {{vars.ciudad}} ✅\n\n" +
    "No te voy a escribir todos los días. Solo cuando tiemble lo suficiente para que se sienta ahí.\n\n" +
    "Un aviso honesto: esto no es alerta temprana. El mensaje te llega después del temblor, no antes. Sirve para confirmar qué pasó, avisarte de las réplicas y decirte qué tan fuerte te tocó.\n\n" +
    "Escribí BAJA cuando quieras dejar de recibirlas.",
});

workflow.addEdge(START, "saludo");
workflow.addEdge("saludo", "recibir_ciudad");
workflow.addEdge("recibir_ciudad", "confirmar");

export default workflow;
