# Centinela

Alertas ciudadanas por WhatsApp sobre lo que el Estado publica pero nadie lee.

Colombia publica en datos abiertos cada contrato estatal y cada sismo detectado. El problema nunca fue el acceso: fue que el dato es *pull* y la atención humana es *push*. Centinela invierte la carga — vigila las fuentes oficiales y le escribe al ciudadano cuando algo le afecta.

Dos frentes:

- **Contratación pública.** Detecta señales de riesgo en los contratos del SECOP II y avisa cuando aparecen en tu municipio.
- **Sismos.** Confirmación, réplicas y aviso de tsunami para quien no tiene alertas nativas — es decir, todo usuario de iPhone en Colombia.

## Por qué existe

**Contratación:** de los 743.000 contratos firmados en 2026, **596.080 son contratación directa** — la modalidad sin competencia — por $610 billones de pesos. La licitación pública, el mecanismo competitivo por excelencia, son 1.089 contratos: el 0,15%. El dato está publicado. Nadie lo mira.

**Sismos:** el 10 de agosto de 2026 un M7.4 sacudió Colombia con epicentro en San José del Palmar, Chocó. Los Android sonaron segundos antes. Los iPhone no sonaron. Apple solo opera alertas sísmicas en Estados Unidos y Taiwán.

## Lo que sí hace y lo que no

Este proyecto **no** es alerta sísmica temprana y no debe presentarse como tal.

Medido contra las APIs públicas: USGS publica un evento entre 93 y 186 segundos después del origen. La onda S llega a Cali desde el Chocó en ~43 s, a Medellín en ~51 s, a Bogotá en ~100 s. **La alerta siempre llega después del temblor.** Google puede avisar antes porque los 2.000 millones de Android *son* la red de sensores; ni la API pública ni WhatsApp cierran esa brecha.

Lo que sí aporta valor real:

| | Ventaja de tiempo | Valor |
|---|---|---|
| Confirmación del evento | ninguna | Corta el pánico y la desinformación cuando las redes colapsan |
| Réplicas | sí | Tras el M7.4 vinieron M5.0, M4.3, M4.2. La gente duerme en la calle días |
| Tsunami | 20–40 min en el Pacífico | Aquí la latencia es irrelevante y salva vidas |
| Intensidad personalizada | — | Un M4 a 10 km de Quibdó importa; el mismo M4 no le importa a Bogotá |

## Fuentes de datos

Todas verificadas en vivo el 15 de agosto de 2026.

| Fuente | Uso | Estado |
|---|---|---|
| `datos.gov.co` `jbjy-vk9h` | Contratos SECOP II, 85 columnas | ✅ operativa |
| `datos.gov.co` `cb9c-h8sn` | Adiciones y prórrogas | ✅ operativa |
| `datos.gov.co` `p6dx-8zbt` | Procesos: precio base vs adjudicado | ✅ operativa |
| USGS FDSN | Sismos, latencia 93–186 s | ✅ operativa |
| EMSC Seismic Portal | Sismos, respaldo | ✅ operativa |
| SGC `catalogo_sismos` | — | ❌ congelado en dic-2020 |

El Servicio Geológico Colombiano no expone un feed público en tiempo real. Su catálogo ArcGIS tiene 16.290 registros y el último evento es del 30/12/2020; el resto son formularios PHP. Toca USGS + EMSC.

### Trampa conocida

El campo `ultima_actualizacion` del SECOP viene vacío en buena parte de los registros y no sirve como cursor. La sincronización va por `fecha_de_firma` con una ventana de re-escaneo de 30 días hacia atrás, porque el SECOP recibe cargas retroactivas. Sin esa ventana se pierden contratos.

## La restricción que define la arquitectura

WhatsApp no deja empujar el primer mensaje.

Probado seis veces contra tres números y cuatro plantillas aprobadas: **toda plantilla de categoría MARKETING hacia alguien que nunca le ha escrito al negocio falla con error 131049** — *"not delivered to maintain healthy ecosystem engagement"*. No hay parámetro que lo evite; la condición de desbloqueo es un mensaje entrante.

Consecuencias de diseño, no negociables:

1. **El onboarding empieza con el usuario escribiendo primero.** Link `wa.me` o QR con mensaje precargado. Captar suscriptores empujándoles el primer mensaje no funciona: no llega ninguno.
2. **Toda alerta fuera de la ventana de 24 h va por plantilla UTILITY.** Las UTILITY están exentas del tope 131049. Ojo: Meta reclasifica — dos plantillas de este mismo proyecto pasaron de UTILITY a MARKETING solas.
3. **Dentro de la ventana de 24 h, texto libre y gratis.** Ahí vive la conversación: preguntas, explicaciones, derechos de petición.

### Costo

Colombia tiene una de las tarifas más bajas del mundo para plantillas *utility*: **≈ US$0,0008 por mensaje entregado**. Diez mil alertas cuestan 8 dólares. El canal no es el costo; el costo es la inferencia del modelo, y solo se paga sobre lo que ya pasó el filtro determinístico.

## Estructura

```
docs/prd-contratacion.html      PRD del frente de contratación pública
workflows/bienvenida/           Flujo de suscripción por WhatsApp
functions/                      Funciones Kapso
```

## Desarrollo

```bash
npm install
kapso build          # compila workflows/**/workflow.ts a JSON
kapso push           # publica en Kapso (queda en draft, hay que activarlo)
```

El workflow `bienvenida` se dispara con cualquier mensaje entrante al número configurado, ofrece elegir tema, pide municipio y confirma la suscripción.

## Estado

Prototipo. Las fuentes están verificadas y el envío por WhatsApp está probado de punta a punta; el motor de señales y el sincronizador todavía no están construidos.
