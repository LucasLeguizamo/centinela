import { START, Workflow } from '@kapso/workflows';

const workflow = new Workflow("bienvenida", {
  name: "Bienvenida y suscripción a alertas",
  status: "draft",
});

workflow.addNode(START, {
  "position": {
    "x": 100,
    "y": 100
  }
});

workflow.addTrigger({
  "active": true,
  "type": "inbound_message",
  "phoneNumberId": "1243233552205505"
});

workflow.addNode("saludo", {
  "config": {
    "whatsapp_config_id": null,
    "phone_number_id": null,
    "interactive_type": "button",
    "body_text": `Hola 👋 Soy Centinela. Vigilo lo público y te aviso cuando algo te afecta, sin que tengas que buscar nada.

¿Sobre qué querés recibir alertas?`,
    "footer_text": "Escribí BAJA cuando quieras dejar de recibirlas",
    "header_config": {
      "text": "Centinela",
      "type": "text"
    },
    "action_config": {
      "buttons": [
        {
          "id": "sismos",
          "title": "Sismos"
        },
        {
          "id": "contratos",
          "title": "Contratos públicos"
        },
        {
          "id": "ambas",
          "title": "Las dos"
        }
      ]
    },
    "header_type": "text",
    "header_text": "Centinela",
    "buttons": [
      {
        "id": "sismos",
        "title": "Sismos"
      },
      {
        "id": "contratos",
        "title": "Contratos públicos"
      },
      {
        "id": "ambas",
        "title": "Las dos"
      }
    ],
    "provider_model_id": null,
    "provider_model_name": null,
    "ai_field_config": {},
    "to_phone_number": null
  },
  "nodeType": "send_interactive",
  "type": "raw"
}, {
  "position": {
    "x": 240,
    "y": 0
  },
  "displayName": "Send Interactive Message"
});

workflow.addNode("elegir_tema", {
  "config": {
    "has_timeout": false,
    "timeout_seconds": null,
    "save_response_to": "tema"
  },
  "nodeType": "wait_for_response",
  "type": "raw"
}, {
  "position": {
    "x": 480,
    "y": 0
  },
  "displayName": "Wait for Response"
});

workflow.addNode("pedir_ciudad", {
  "config": {
    "whatsapp_config_id": null,
    "phone_number_id": null,
    "message": `Listo. ¿En qué municipio estás?

Lo uso para dos cosas: calcular qué tan fuerte se sentiría un sismo donde estás, y vigilar los contratos de tu alcaldía. Respondé solo el nombre, por ejemplo: Quibdó.`,
    "delay_seconds": 0,
    "provider_model_id": null,
    "provider_model_name": null,
    "ai_field_config": {},
    "to_phone_number": null
  },
  "nodeType": "send_text",
  "type": "raw"
}, {
  "position": {
    "x": 720,
    "y": 0
  },
  "displayName": "Send Text Message"
});

workflow.addNode("recibir_ciudad", {
  "config": {
    "has_timeout": false,
    "timeout_seconds": null,
    "save_response_to": "ciudad"
  },
  "nodeType": "wait_for_response",
  "type": "raw"
}, {
  "position": {
    "x": 960,
    "y": 0
  },
  "displayName": "Wait for Response"
});

workflow.addNode("confirmar", {
  "config": {
    "whatsapp_config_id": null,
    "phone_number_id": null,
    "message": `Quedaste suscrito para {{vars.ciudad}} ✅

No te voy a escribir todos los días. Solo cuando pase algo que valga la pena: un sismo que se sienta ahí, una réplica, o un contrato de tu alcaldía con señales de riesgo.

Podés responderme en cualquier momento si querés entender algo.`,
    "delay_seconds": 0,
    "provider_model_id": null,
    "provider_model_name": null,
    "ai_field_config": {},
    "to_phone_number": null
  },
  "nodeType": "send_text",
  "type": "raw"
}, {
  "position": {
    "x": 1200,
    "y": 0
  },
  "displayName": "Send Text Message"
});

workflow.addEdge(START, "saludo");

workflow.addEdge("saludo", "elegir_tema");

workflow.addEdge("elegir_tema", "pedir_ciudad");

workflow.addEdge("pedir_ciudad", "recibir_ciudad");

workflow.addEdge("recibir_ciudad", "confirmar");

export default workflow;
